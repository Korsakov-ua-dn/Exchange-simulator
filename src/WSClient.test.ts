import Server from "jest-websocket-mock";
import WSConnector from "./WSClient";
import Decimal from "decimal.js";

import { ClientMessageType, Instrument, ServerMessageType } from "./Enums";
import { ClientEnvelope, SubscribeMarketData } from "./Models/ClientMessages";
import { MarketDataUpdate, ServerEnvelope } from "./Models/ServerMessages";

describe("WS", () => {
  let server: Server;
  beforeEach(() => {
    server = new Server("ws://127.0.0.1:3000/ws/", {
      jsonProtocol: true,
    });
  });

  // ClientMessageType.subscribeMarketData
  it("the server keeps track of received messages, and yields them as they come in", async () => {
    const client = new WSConnector();
    client.connect();
    await server.connected;

    const message: SubscribeMarketData = {
      instrument: Instrument.usd_rub
    }
    const request: ClientEnvelope = {
      messageType: ClientMessageType.subscribeMarketData,
      message,
    };

    client.send(request);
    await expect(server).toReceiveMessage(request);
    expect(server).toHaveReceivedMessages([request]);
  });

  // ServerMessageType.marketDataUpdate
  it("the mock server sends messages to connected clients", async () => {
    const client1 = new WSConnector();
    client1.connect()
    await server.connected;
    const client2 = new WSConnector();
    client2.connect()
    await server.connected;

    const messages1: ServerEnvelope[] = [];
    const messages2: ServerEnvelope[] = [];
    if (typeof client1.connection !== "undefined") {
      client1.connection.onmessage = (e) => {
        messages1.push(e.data);
      };
    }
    if (typeof client2.connection !== "undefined") {
      client2.connection.onmessage = (e) => {
        messages2.push(e.data);
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
    expect(messages1).toEqual([JSON.stringify(responce)]);
    expect(messages2).toEqual([JSON.stringify(responce)]);
  });

  // Server error
  it("the mock server sends errors to connected clients", async () => {
    const client = new WSConnector();
    client.connect();
    await server.connected;

    let disconnected = false;
    const cb = jest.fn()
    if (typeof client.connection !== "undefined") {
      client.connection.onclose = () => {
        disconnected = true;
      };
      client.connection.onerror = cb;
    }
  
    server.error();
    expect(disconnected).toBe(true);
    expect(cb).toHaveBeenCalled();
  
  });

  afterEach(() => {
    server.close();
  })
});
