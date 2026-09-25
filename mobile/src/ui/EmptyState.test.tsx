import { fireEvent, render, screen } from '@testing-library/react-native';

import { theme } from '@/theme';
import { EmptyState } from '@/ui/EmptyState';

const icon = 'M12 8v4M12 16h.01';

describe('EmptyState', () => {
  it('shows the icon, the title and the reason on a card from the tokens', async () => {
    await render(<EmptyState icon={icon} title="No driving route" body="Fika found no way to drive there." />);
    expect(screen.getByRole('header', { name: 'No driving route' })).toBeOnTheScreen();
    expect(screen.getByText('Fika found no way to drive there.')).toBeOnTheScreen();
    const drawn = screen.container.queryAll((n) => typeof n.props.d === 'string').map((n) => n.props.d);
    expect(drawn).toEqual([icon]);
    expect(screen.getByTestId('empty-state')).toHaveStyle({
      backgroundColor: theme.color.surface,
      borderRadius: theme.radius.card,
    });
  });

  it('calls the action when its button is pressed', async () => {
    const onPress = jest.fn();
    await render(<EmptyState icon={icon} title="Couldn’t get routes" body="Network request failed" action={{ label: 'Try again', onPress }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders no button without an action', async () => {
    await render(<EmptyState icon={icon} title="No driving route" body="Fika found no way to drive there." />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
