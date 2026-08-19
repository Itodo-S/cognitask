import type { FastifyReply, FastifyRequest } from "fastify";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  limit: number;
  offset: number;
}

export interface RouteContext {
  request: FastifyRequest;
  reply: FastifyReply;
}
