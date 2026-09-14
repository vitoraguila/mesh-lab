"""Offline acceptance checks using disposable app/chart fixtures."""
import copy
import os
import watch
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import learning_catalog as learning
import yaml


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.write('deploy/helm/platform/Chart.yaml', yaml.safe_dump({'dependencies': [
            {'name': 'fixture', 'repository': 'file://../../../apps/fixture/deploy/helm'}]}))
        self.write('apps/fixture/main.go', '// before\nfunc handler() {}\n// after\n')
        self.write('apps/fixture/deploy/helm/values.yaml', 'replicas: 1\n')
        self.write('apps/fixture/deploy/helm/templates/service.yaml', 'kind: Service\n')
        self.descriptor = {'title': 'Fixture API', 'operations': [{
            'id': 'read', 'title': 'Read fixture', 'method': 'GET', 'protocol': 'rest',
            'path': '/fixture', 'input': {}}], 'steps': [{
            'id': 'handler', 'sources': [{'file': 'apps/fixture/main.go', 'anchor': 'func handler'}]}]}

    def write(self, name, content):
        path = self.root/name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path

    def build(self, **kwargs):
        return learning.build('stg', root=self.root, **kwargs)

    def describe(self):
        self.write('apps/fixture/learn.yaml', yaml.safe_dump(self.descriptor))

    def test_discovery_without_and_with_descriptor(self):
        service = self.build()['services'][0]
        self.assertEqual(service['id'], 'fixture')
        self.assertEqual(service['operations'], [])
        self.assertIn('apps/fixture/deploy/helm/values.yaml', service['files'])
        self.describe()
        service = self.build()['services'][0]
        self.assertEqual(service['protocol'], 'rest')
        self.assertEqual(service['operations'][0]['id'], 'read')

    def test_anchors_move_and_invalid_mappings_are_diagnostic(self):
        self.describe()
        def lines(): return self.build()['services'][0]['steps'][0]['sources'][0]['lines']
        self.assertEqual(lines()[0], 2)
        path = self.root/'apps/fixture/main.go'
        path.write_text('// inserted\n' + path.read_text())
        self.assertEqual(lines()[0], 3)
        path.write_text('func handler() {}\nfunc handler() {}\n')
        with self.assertRaisesRegex(ValueError, 'exactly once'): self.build()
        self.assertTrue(self.build(strict=False)['diagnostics'])
        path.unlink()
        with self.assertRaisesRegex(ValueError, 'Missing or excluded'): self.build()

    def test_secrets_traversal_symlinks_and_other_environment_are_excluded(self):
        self.describe()
        self.write('apps/fixture/deploy/environments/stg/opaque.yaml', 'kind: Secret\ndata:\n  opaque: never-publish\n')
        self.write('.local/private.yaml', 'password: never-publish\n')
        self.write('apps/fixture/.env', 'TOKEN=never-publish\n')
        self.write('apps/fixture/deploy/environments/prd/config.yaml', 'other: never-publish\n')
        self.write('apps/fixture/deploy/environments/stg/config.yaml', 'fixture:\n  config:\n    PASSWORD: sensitive-value\n')
        (self.root/'apps/fixture/leak.yaml').symlink_to(self.root/'.local/private.yaml')
        catalog = self.build()
        self.assertNotIn('never-publish', str(catalog))
        self.assertNotIn('sensitive-value', str(catalog))
        self.assertFalse(learning.approved(self.root/'../outside.yaml', self.root))
        self.descriptor['steps'][0]['sources'][0]['file'] = '../../outside.yaml'
        self.describe()
        with self.assertRaisesRegex(ValueError, 'Missing or excluded'): self.build()

    def test_rendered_identity_field_mapping_and_contributors(self):
        self.descriptor['steps'][0]['sources'] = [{'file': 'apps/fixture/deploy/helm/templates/service.yaml', 'pointer': '/spec/ports/0/port'}]
        self.describe()
        rendered = '''# Source: platform/charts/fixture/templates/service.yaml
kind: Service
metadata:
  name: fixture
spec:
  ports:
  - port: 8080
---
# Source: platform/charts/fixture/templates/service.yaml
kind: Secret
metadata:
  name: private
data:
  password: never-publish
'''
        catalog = self.build(rendered=rendered)
        file = catalog['files']['apps/fixture/deploy/helm/templates/service.yaml']
        self.assertEqual(len(file['rendered']), 1)
        self.assertEqual(file['rendered'][0]['id'], 'Service/fixture')
        self.assertIn('apps/fixture/deploy/helm/values.yaml', file['rendered'][0]['contributors'])
        self.assertNotIn('never-publish', str(catalog))
        self.assertIsNotNone(catalog['services'][0]['steps'][0]['sources'][0]['renderedLines']['Service/fixture'])
        self.descriptor['steps'][0]['sources'][0]['pointer'] = '/spec/missing'
        self.describe()
        with self.assertRaisesRegex(ValueError, 'missing field'): self.build(rendered=rendered)

    def test_invalid_operation_and_size_limits_fail_before_publication(self):
        operation = self.descriptor['operations'][0]
        for path in ['https://example.com', '//example.com', '/../private', '/a?url=x']:
            with self.assertRaises(ValueError): learning.validate_operation({**operation, 'path': path})
        self.descriptor['operations'].append(copy.deepcopy(operation))
        self.describe()
        with self.assertRaisesRegex(ValueError, 'duplicate'): self.build()
        with patch.object(learning, 'MAX_FILE', 3):
            with self.assertRaisesRegex(ValueError, 'exceeds'): learning.safe_content(self.root/'apps/fixture/main.go')
        with patch.object(learning, 'MAX_BUNDLE', 3):
            with self.assertRaisesRegex(ValueError, 'budget'): learning.encode({'test': 'data'})

    def test_grpc_contract_must_have_registered_unary_method(self):
        self.write('apps/fixture/proto/api.proto', 'syntax = "proto3"; package fixture; message Input {} message Output {} service API { rpc Read(Input) returns (Output); }')
        self.descriptor['operations'] = [{'id': 'read', 'title': 'Read', 'method': 'POST', 'protocol': 'grpc', 'path': '/fixture.API/Read', 'rpcService': 'fixture.API', 'rpcMethod': 'Read', 'proto': 'proto/api.proto', 'input': {}}]
        self.describe()
        self.assertIn('protoContent', self.build()['services'][0]['operations'][0])
        self.write('apps/fixture/proto/api.proto', 'syntax = "proto3"; package fixture; message Input {} message Output {} service API { rpc Changed(Input) returns (Output); }')
        with self.assertRaisesRegex(ValueError, 'invalid Protobuf method'): self.build()

    def test_learning_watcher_tracks_source_and_only_selected_environment(self):
        old = Path.cwd()
        try:
            os.chdir(self.root)
            before = watch.snapshot('stg', learn=True)
            self.write('apps/fixture/deploy/environments/prd/config.yaml', 'other: changed\n')
            self.write('.local/stg/private.yaml', 'secret: ignored\n')
            self.assertEqual(before, watch.snapshot('stg', learn=True))
            self.write('apps/fixture/main.go', 'func updated() {}\n')
            self.assertNotEqual(before, watch.snapshot('stg', learn=True))
        finally:
            os.chdir(old)

    def test_source_revision_changes_for_code_but_not_configuration(self):
        before = learning.source_revision('fixture', self.root)
        self.write('apps/fixture/deploy/helm/values.yaml', 'replicas: 2\n')
        self.assertEqual(before, learning.source_revision('fixture', self.root))
        self.write('apps/fixture/main.go', 'func changed() {}\n')
        self.assertNotEqual(before, learning.source_revision('fixture', self.root))


if __name__ == '__main__':
    unittest.main()
