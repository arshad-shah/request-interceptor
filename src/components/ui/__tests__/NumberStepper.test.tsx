import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberStepper from '../NumberStepper';

const setup = (props: Partial<React.ComponentProps<typeof NumberStepper>> = {}) => {
  const onChange = vi.fn();
  render(<NumberStepper label="Count" value={5} min={1} max={10} onChange={onChange} {...props} />);
  return { onChange, input: screen.getByRole('spinbutton', { name: 'Count' }) };
};

describe('NumberStepper', () => {
  it('steps with the buttons and disables them at the limits', () => {
    const { onChange } = setup({ value: 10 });
    expect(screen.getByRole('button', { name: 'Increase Count' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Count' }));
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('commits typed values on Enter, clamped to range', () => {
    const { onChange, input } = setup();
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(10);
    expect(input).toHaveValue('10');
  });

  it('reverts invalid or empty input on blur without calling onChange', () => {
    const { onChange, input } = setup();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('5');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports arrow keys with Shift for ×10 and snaps to step', () => {
    const { onChange, input } = setup({ value: 100, min: 0, max: 1000, step: 50 });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(150);
    fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('exposes spinbutton semantics', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('aria-valuemin', '1');
    expect(input).toHaveAttribute('aria-valuemax', '10');
    expect(input).toHaveAttribute('aria-valuenow', '5');
  });
});
