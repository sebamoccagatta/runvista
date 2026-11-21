import { describe, expect, it } from 'vitest';

import {
  createRunSchema,
  runIdParamsSchema,
  runStatusSchema,
  updateRunSchema,
} from './run.schemas.js';

describe('createRunSchema', () => {
  it('accepts a valid run', () => {
    const result = createRunSchema.safeParse({
      title: 'Pokémon Y Randomlocke',
      description: 'Randomlocke de sexta generación',
    });

    expect(result.success).toBe(true);
  });

  it('allows a run without a description', () => {
    const result = createRunSchema.safeParse({
      title: 'Pokémon Esmeralda',
    });

    expect(result.success).toBe(true);
  });

  it('trims whitespace from text fields', () => {
    const result = createRunSchema.parse({
      title: '  Pokémon Y  ',
      description: '  Mi primera partida  ',
    });

    expect(result.title).toBe('Pokémon Y');
    expect(result.description).toBe('Mi primera partida');
  });

  it('rejects an empty title', () => {
    expect(createRunSchema.safeParse({ title: '' }).success).toBe(false);
    expect(createRunSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('rejects a title longer than 150 characters', () => {
    const result = createRunSchema.safeParse({
      title: 'a'.repeat(151),
    });

    expect(result.success).toBe(false);
  });

  it('rejects a description longer than 2000 characters', () => {
    const result = createRunSchema.safeParse({
      title: 'Pokémon Y',
      description: 'a'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('rejects an explicitly provided ownerId', () => {
    const result = createRunSchema.safeParse({
      title: 'Pokémon Y',
      ownerId: 'another-user-id',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an explicitly provided status', () => {
    const result = createRunSchema.safeParse({
      title: 'Pokémon Y',
      status: 'COMPLETED',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateRunSchema', () => {
  it('accepts a title update', () => {
    const result = updateRunSchema.safeParse({
      title: 'Nuevo nombre',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid status update', () => {
    const result = updateRunSchema.safeParse({
      status: 'ACTIVE',
    });

    expect(result.success).toBe(true);
  });

  it('allows clearing the description', () => {
    const result = updateRunSchema.parse({
      description: null,
    });

    expect(result.description).toBeNull();
  });

  it('rejects an empty update', () => {
    expect(updateRunSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = updateRunSchema.safeParse({
      status: 'UNKNOWN',
    });

    expect(result.success).toBe(false);
  });

  it('rejects attempts to change ownership', () => {
    const result = updateRunSchema.safeParse({
      ownerId: 'another-user-id',
    });

    expect(result.success).toBe(false);
  });

  it('rejects attempts to change the run ID', () => {
    const result = updateRunSchema.safeParse({
      id: 'another-run-id',
    });

    expect(result.success).toBe(false);
  });
});

describe('runStatusSchema', () => {
  it('accepts all supported statuses', () => {
    const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED'];

    for (const status of statuses) {
      expect(runStatusSchema.safeParse(status).success).toBe(true);
    }
  });
});

describe('runIdParamsSchema', () => {
  it('accepts a valid UUID', () => {
    const result = runIdParamsSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid UUID', () => {
    const result = runIdParamsSchema.safeParse({
      id: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});
