import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { ImageJobPayload } from '../interfaces/job.interface';

@Injectable()
export class QueueService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.queueUrl = this.configService.getOrThrow<string>('SQS_QUEUE_URL');

    this.sqsClient = new SQSClient({
      region,
    });
  }

  async sendMessage(payload: ImageJobPayload): Promise<void> {
    const stringPayload = JSON.stringify(payload);

    await this.sqsClient.send(
      new SendMessageCommand({
        MessageBody: stringPayload,
        QueueUrl: this.queueUrl,
      }),
    );
  }

  async receiveMessage() {
    const message = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 1,
      }),
    );

    return message.Messages?.[0] || null;
  }

  async deleteMessage(message: Message) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }
}
