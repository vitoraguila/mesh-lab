#!/usr/bin/env python3
"""Forward the web service, choosing the next free loopback port if needed."""
import argparse
import socket
import subprocess


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env', choices=['stg', 'prd'], required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--service', default='web', choices=['web', 'grafana'])
    parser.add_argument('--target', type=int, default=3000)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')

    for port in range(args.port, min(args.port + 100, 65536)):
        with socket.socket() as probe:
            try:
                probe.bind(('127.0.0.1', port))
            except OSError:
                print(f'Port {port} is unavailable; trying the next port.', flush=True)
                continue

        command = ['kubectl', '--context=mesh-study', '-n', args.env,
                   'port-forward', '--address=127.0.0.1', f'svc/{args.service}', f'{port}:{args.target}']
        process = subprocess.Popen(command, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
        collision = False
        try:
            for line in process.stdout:
                print(line, end='', flush=True)
                if 'address already in use' in line:
                    collision = True
                if line.startswith('Forwarding from '):
                    print(f'Open http://localhost:{port} ({args.service} / {args.env}). Ctrl+C stops forwarding.', flush=True)
            code = process.wait()
        except KeyboardInterrupt:
            process.terminate()
            process.wait()
            return 130
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait()
            process.stdout.close()
        # Another process may bind between the availability check and kubectl.
        if collision:
            continue
        return code
    print('No available port found in the next 100 ports. Set PORT to another starting port.', flush=True)
    return 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
