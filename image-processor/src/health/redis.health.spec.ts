import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import { RedisCacheService } from 'src/common/services/cache.service';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let redisService: jest.Mocked<RedisCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: RedisCacheService,
          useValue: { set: jest.fn() },
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    redisService = module.get(RedisCacheService);
  });

  it('returns healthy status when Redis responds', async () => {
    redisService.set.mockResolvedValue(undefined);

    const result = await indicator.isHealthy('redis');

    expect(result).toEqual({ redis: { status: 'up' } });
    expect(redisService.set).toHaveBeenCalledWith('__health__', 1, 5);
  });

  it('throws HealthCheckError when Redis is unreachable', async () => {
    redisService.set.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);
  });
});
