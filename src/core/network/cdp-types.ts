/**
 * Minimal Chrome DevTools Protocol `Network.*` event params.
 *
 * Only the fields the network capture reads are declared; CDP sends more.
 * Everything is optional-ish where Chrome is known to omit it.
 */

/** CDP sends headers as an object; some synthetic sources already use arrays. */
export type CdpHeaders = Record<string, unknown> | { name: string; value: string }[];

export interface CdpInitiator {
  type?: string;
  url?: string;
}

export interface CdpRequest {
  url: string;
  method: string;
  headers?: CdpHeaders;
  hasPostData?: boolean;
  postData?: string;
}

export interface CdpResourceTiming {
  dnsStart?: number;
  dnsEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  sslStart?: number;
  sslEnd?: number;
  sendStart?: number;
  sendEnd?: number;
  receiveHeadersEnd?: number;
}

export interface CdpResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  mimeType?: string;
  protocol?: string;
  remoteIPAddress?: string;
  remotePort?: number;
  fromDiskCache?: boolean;
  fromPrefetchCache?: boolean;
  fromServiceWorker?: boolean;
  encodedDataLength?: number;
  timing?: CdpResourceTiming;
}

export interface RequestWillBeSentParams {
  requestId: string;
  request: CdpRequest;
  /** Monotonic seconds. */
  timestamp: number;
  type?: string;
  initiator?: CdpInitiator;
  frameId?: string;
  redirectResponse?: CdpResponse;
}

export interface RequestExtraInfoParams {
  requestId: string;
  headers?: CdpHeaders;
}

export interface ResponseReceivedParams {
  requestId: string;
  timestamp: number;
  response: CdpResponse;
}

export interface ResponseExtraInfoParams {
  requestId: string;
  headers?: CdpHeaders;
  statusCode?: number;
}

export interface DataReceivedParams {
  requestId: string;
  dataLength: number;
  encodedDataLength: number;
}

export interface LoadingFinishedParams {
  requestId: string;
  timestamp: number;
  encodedDataLength?: number;
}

export interface LoadingFailedParams {
  requestId: string;
  timestamp: number;
  errorText?: string;
  canceled?: boolean;
}

export interface WebSocketCreatedParams {
  requestId: string;
  url: string;
  initiator?: CdpInitiator;
}

export interface WebSocketHandshakeRequestParams {
  requestId: string;
  timestamp: number;
  request?: { headers?: CdpHeaders };
}

export interface WebSocketHandshakeResponseParams {
  requestId: string;
  timestamp: number;
  response?: { status?: number; statusText?: string; headers?: CdpHeaders };
}

export interface WebSocketFrameParams {
  requestId: string;
  timestamp: number;
  response?: { opcode?: number; mask?: boolean; payloadData?: string };
}

export interface WebSocketClosedParams {
  requestId: string;
  timestamp: number;
}

/** CDP method name → params, for the events the capture handles. */
export interface NetworkEventMap {
  'Network.requestWillBeSent': RequestWillBeSentParams;
  'Network.requestWillBeSentExtraInfo': RequestExtraInfoParams;
  'Network.responseReceived': ResponseReceivedParams;
  'Network.responseReceivedExtraInfo': ResponseExtraInfoParams;
  'Network.dataReceived': DataReceivedParams;
  'Network.loadingFinished': LoadingFinishedParams;
  'Network.loadingFailed': LoadingFailedParams;
  'Network.webSocketCreated': WebSocketCreatedParams;
  'Network.webSocketWillSendHandshakeRequest': WebSocketHandshakeRequestParams;
  'Network.webSocketHandshakeResponseReceived': WebSocketHandshakeResponseParams;
  'Network.webSocketFrameSent': WebSocketFrameParams;
  'Network.webSocketFrameReceived': WebSocketFrameParams;
  'Network.webSocketClosed': WebSocketClosedParams;
}

export type NetworkEventMethod = keyof NetworkEventMap;
