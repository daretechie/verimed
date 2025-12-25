import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const serviceName = 'verimed-api';

// Production Ready: Use OTLP if endpoint is configured, otherwise fallback to Console
const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, // e.g., 'http://localhost:4318/v1/traces'
    })
  : new ConsoleSpanExporter();

export const otelSdk = new NodeSDK({
  serviceName,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations if needed, e.g. fs
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

// Start the SDK
otelSdk.start();

// Graceful shutdown on process exit
process.on('SIGTERM', () => {
  otelSdk
    .shutdown()
    .then(() => console.log('OTel SDK terminated'))
    .catch((error: Error) => console.log('Error terminating OTel SDK', error.message));
});
