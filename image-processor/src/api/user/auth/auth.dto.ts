import { z } from 'zod';

// 1. Define the Schema (Runtime Validation)
export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(5),
});

// 2. Infer the DTO Type (Compile-time Type)
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
