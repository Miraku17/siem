// POST /applications was typed inline with no DTO, so the global ValidationPipe
// had nothing to enforce and `whitelist: true` stripped nothing — any shape,
// including a slug that collides with routing or breaks the SDK, got through.
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterApplicationDto } from './register-application.dto';

function errorsFor(payload: unknown): string[] {
  const dto = plainToInstance(RegisterApplicationDto, payload);
  return validateSync(dto as object).map((e) => e.property);
}

describe('RegisterApplicationDto', () => {
  it('accepts a well-formed registration', () => {
    expect(errorsFor({ name: 'Bedrock 360', slug: 'bedrock-360' })).toEqual([]);
  });

  it('requires a name', () => {
    expect(errorsFor({ slug: 'bedrock-360' })).toContain('name');
  });

  it('rejects a blank name', () => {
    expect(errorsFor({ name: '   ', slug: 'bedrock-360' })).toContain('name');
  });

  it('requires a slug', () => {
    expect(errorsFor({ name: 'Bedrock 360' })).toContain('slug');
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(errorsFor({ name: 'Bedrock', slug: 'Bedrock 360' })).toContain('slug');
  });

  it('rejects a slug with path characters', () => {
    expect(errorsFor({ name: 'Bedrock', slug: '../../etc' })).toContain('slug');
  });

  it('rejects a non-string name', () => {
    expect(errorsFor({ name: { $ne: null }, slug: 'bedrock-360' })).toContain(
      'name',
    );
  });
});
