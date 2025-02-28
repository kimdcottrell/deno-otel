import { diag, DiagConsoleLogger, DiagLogLevel } from 'npm:@opentelemetry/api';

// Set up diagnostic logging to output to the console with DEBUG level
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

import {
	Attributes,
	context,
	Span,
	SpanStatusCode,
	trace,
} from 'npm:@opentelemetry/api';
import { logs, NodeSDK } from 'npm:@opentelemetry/sdk-node';
import { NodeTracerProvider } from 'npm:@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from 'npm:@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from 'npm:@opentelemetry/exporter-trace-otlp-proto';

import { OTLPLogExporter } from 'npm:@opentelemetry/exporter-logs-otlp-proto';
import {
	ConsoleLogRecordExporter,
	LoggerProvider,
	SimpleLogRecordProcessor,
} from 'npm:@opentelemetry/sdk-logs';

import {
	ATTR_HTTP_ROUTE,
	ATTR_SERVICE_NAME,
} from 'npm:@opentelemetry/semantic-conventions';
import {
	ConsoleSpanExporter,
	SimpleSpanProcessor,
} from 'npm:@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from 'npm:@opentelemetry/instrumentation';
import { ExpressRequestInfo } from 'npm:@opentelemetry/instrumentation-express';
// imports for resource attributes
import {
	detectResourcesSync,
	envDetector,
	processDetector,
	Resource,
} from 'npm:@opentelemetry/resources';
import { containerDetector } from 'npm:@opentelemetry/resource-detector-container';

// get http resource data in place
Deno.env.set('OTEL_SEMCONV_STABILITY_OPT_IN', 'http/dup');

// setup resource attributes
const resource = new Resource({
	[ATTR_SERVICE_NAME]: 'otel-express-attempt',
});
const detectedResources = detectResourcesSync({
	detectors: [
		containerDetector,
		envDetector,
		processDetector,
	],
});

const traceExporter = new OTLPTraceExporter({});
const traceProvider = new NodeTracerProvider({
	resource: resource.merge(detectedResources),
	spanProcessors: [
		new SimpleSpanProcessor(traceExporter),
		new SimpleSpanProcessor(new ConsoleSpanExporter()),
	],
});
traceProvider.register();

const logExporter = new OTLPLogExporter({});
const logProvider = new LoggerProvider({
	resource: resource.merge(detectedResources),
});
logProvider.addLogRecordProcessor(
	new SimpleLogRecordProcessor(logExporter),
);
const logger = logProvider.getLogger('test_log_instrumentation');

// const sdk = new NodeSDK({
// 	traceExporter: new OTLPTraceExporter({}),
// 	logRecordProcessors: [
// 		new logs.SimpleLogRecordProcessor(
// 			new OTLPLogExporter({}),
// 		),
// 	],
// 	instrumentations: [
// 		getNodeAutoInstrumentations({
// 			// TODO: why are the custom configs here not working?
// 			'@opentelemetry/instrumentation-http': {
// 				applyCustomAttributesOnSpan: (span: Span): void => {
// 					console.log(span);
// 					span.setAttribute('span kind', 'foo');
// 				},
// 			},
// 			'@opentelemetry/instrumentation-express': {
// 				requestHook: (span: Span, info: ExpressRequestInfo) => {
// 					console.log('here!!!');
// 					span.setAttribute(ATTR_HTTP_ROUTE, info.request.url);
// 					if (info.layerType) {
// 						span.setAttribute(
// 							'express.layer_type',
// 							info.layerType,
// 						);
// 					}
// 				},
// 			},
// 		}),
// 	],
// 	resource: resource.merge(detectedResources),
// });
// sdk.start();

registerInstrumentations({
	tracerProvider: traceProvider,
	loggerProvider: logProvider,
	instrumentations: [
		getNodeAutoInstrumentations({
			// TODO: why are the custom configs here not working?
			'@opentelemetry/instrumentation-http': {
				applyCustomAttributesOnSpan: (span: Span): void => {
					console.log('in http instru');
					console.log(span.spanContext());
					span.setAttribute('span kind', 'foo');
				},
			},
			'@opentelemetry/instrumentation-express': {
				requestHook: (span: Span, info: ExpressRequestInfo) => {
					console.log('here!!!');
					span.setAttribute(ATTR_HTTP_ROUTE, info.request.url);
					if (info.layerType) {
						span.setAttribute(
							'express.layer_type',
							info.layerType,
						);
					}
				},
			},
		}),
	],
});

const getTracer = (serviceName: string) => {
	return trace.getTracer(serviceName);
};

const tracer = getTracer('otel-express-attempt');

import express, { Express } from 'express';

const PORT: number = 4004;
const app: Express = express();

tracer.startActiveSpan('rollTheDice', (parentSpan: Span) => {
	function getRandomNumber(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	app.get('/rolldice', (req, res) => {
		// const ctx = trace.setSpan(context.active(), parentSpan);
		// const span = tracer.startSpan(`${req.method} ${req.url}`, {
		// 	kind: 2,
		// }, ctx);
		tracer.startActiveSpan(`${req.method} ${req.url}`, (span: Span) => {
			span.setStatus({ code: SpanStatusCode.OK });
			span.setAttributes({
				[ATTR_HTTP_ROUTE]: req.url,
			});

			const spanContext = span.spanContext();
			logger.emit({
				body: {
					timestamp: new Date().toLocaleString('en-US', {
						timeZone: 'America/New_York',
					}),
					message: 'hello world',
				},
			});
			span.addEvent('start getRandomNum()');
			res.send(getRandomNumber(1, 6).toString());
			span.addEvent('end getRandomNum()');
			span.end();
		});
	});

	app.listen(PORT, () => {
		console.log(`Listening for requests on http://localhost:${PORT}`);
	});

	parentSpan.end();
});
