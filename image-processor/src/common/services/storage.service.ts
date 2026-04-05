import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow('S3_BUCKET');
    this.s3 = new S3Client({
      region: this.config.getOrThrow('AWS_REGION'),
    });
  }

  async upload(fileName: string, body: Buffer | string, contentType: string) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
      Body: body,
      ContentType: contentType,
    };

    await this.s3.send(new PutObjectCommand(params));
  }

  async uploadBatch(
    files: { key: string; body: Buffer; contentType: string }[],
  ): Promise<void> {
    await Promise.all(
      files.map((f) => this.upload(f.key, f.body, f.contentType)),
    );
  }

  async download(fileName: string) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    const res = await this.s3.send(new GetObjectCommand(params));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async getPresignedUrl(fileName: string) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    const data = await getSignedUrl(this.s3, new GetObjectCommand(params), {
      expiresIn: 3600,
    });

    return data;
  }
}
