{{- define "rabbitmq.labels" -}}
app.kubernetes.io/name: rabbitmq
app.kubernetes.io/part-of: mesh-study
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/environment: {{ .Values.global.environment | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}
{{- define "rabbitmq.queue" -}}
{{ .Values.broker.queue }}.{{ .Values.global.environment }}
{{- end }}
