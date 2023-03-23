import Server from "jest-websocket-mock";
import Decimal from "decimal.js";

import WSConnector from "./WSClient";
import { ClientMessageType, Instrument, ServerMessageType } from "./Enums";
import { ClientEnvelope, SubscribeMarketData } from "./Models/ClientMessages";
import { MarketDataUpdate, ServerEnvelope } from "./Models/ServerMessages";

describe("WS", () => {
  let server: Server;
  let client_1: WSConnector;
  beforeEach(async () => {
    server = new Server("ws://127.0.0.1:3000/ws/", {
      jsonProtocol: true,
    });
    client_1 = new WSConnector();
    client_1.connect();
    await server.connected;
  });

  // ClientMessageType.subscribeMarketData
  it("the server keeps track of received messages, and yields them as they come in", async () => {
    const message: SubscribeMarketData = {
      instrument: Instrument.usd_rub
    }
    const request: ClientEnvelope = {
      messageType: ClientMessageType.subscribeMarketData,
      message,
    };

    client_1.send(request);
    await expect(server).toReceiveMessage(request);
    expect(server).toHaveReceivedMessages([request]);
  });

  // ServerMessageType.marketDataUpdate
  it("the mock server sends messages to connected clients", async () => {
    const client_2 = new WSConnector();
    client_2.connect()
    await server.connected;

    const messages_1: ServerEnvelope[] = [];
    const messages_2: ServerEnvelope[] = [];
    if (typeof client_1.connection !== "undefined") {
      client_1.connection.onmessage = (e) => {
        messages_1.push(e.data);
      };
    }
    if (typeof client_2.connection !== "undefined") {
      client_2.connection.onmessage = (e) => {
        messages_2.push(e.data);
      };
    }

    const message: MarketDataUpdate = {
      subscriptionId: 'string',
      instrument: Instrument.usd_rub,
      quotes: [{
          bid: new Decimal('10'),
          offer: new Decimal('10'),
          minAmount: new Decimal('10'),
          maxAmount: new Decimal('10'),
      }]
    } 
    const responce: ServerEnvelope = {
      messageType: ServerMessageType.marketDataUpdate,
      message
    }

    server.send(responce);
    expect(messages_1).toEqual([JSON.stringify(responce)]);
    expect(messages_2).toEqual([JSON.stringify(responce)]);
  });

  // Server error
  it("the mock server sends errors to connected clients", async () => {
    let disconnected = false;
    const cb = jest.fn()
    if (typeof client_1.connection !== "undefined") {
      client_1.connection.onclose = () => {
        disconnected = true;
      };
      client_1.connection.onerror = cb;
    }
  
    server.error();
    expect(disconnected).toBe(true);
  });

  afterEach(() => {
    server.close();
    Server.clean(); // ?
  })
});
