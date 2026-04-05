import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ImageJobResult } from '../interfaces/job.interface';

@Injectable()
export class NotificationService {
  private readonly snsClient: SNSClient;
  private readonly topicArn: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    this.topicArn = this.configService.getOrThrow<string>('SNS_TOPIC_ARN');
    this.snsClient = new SNSClient({
      region,
    });
  }

  async notifyJobComplete(
    jobId: string,
    results: ImageJobResult[],
  ): Promise<void> {
    const message = {
      event: 'JOB_COMPLETE',
      jobId,
      results,
      timestamp: new Date().toISOString(),
    };

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Subject: `Job ${jobId} Completed`,
        Message: JSON.stringify(message),
      }),
    );
  }

  async notifyJobFailed(jobId: string, error: any): Promise<void> {
    const message = {
      event: 'JOB_FAILED',
      jobId,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    };

    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Subject: `Job ${jobId} Failed`,
        Message: JSON.stringify(message),
      }),
    );
  }
}
