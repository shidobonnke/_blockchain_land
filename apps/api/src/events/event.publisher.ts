import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import mqtt, { MqttClient } from "mqtt";

@Injectable()
export class EventPublisher implements OnModuleDestroy {
  private client?: MqttClient;
  constructor(private config: ConfigService) {}
  publish(userId: string, event: string, payload: Record<string, unknown>) {
    const url = this.config.get<string>("MQTT_URL");
    if (!url) return;
    this.client ??= mqtt.connect(url, {
      clientId: `anagu-api-${process.pid}`,
      reconnectPeriod: 5000,
      clean: false
    });
    this.client.publish(
      `anagu/users/${userId}/events`,
      JSON.stringify({ event, payload, occurredAt: new Date().toISOString() }),
      { qos: 1, retain: false }
    );
  }
  onModuleDestroy() {
    this.client?.end();
  }
}
