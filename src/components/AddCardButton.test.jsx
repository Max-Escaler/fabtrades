import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddCardButton from './AddCardButton';

const theme = createTheme();

const defaultProps = {
  onClick: jest.fn(),
  disabled: false,
  children: 'Add Card'
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AddCardButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders button with correct text', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      expect(screen.getByText('Add Card')).toBeInTheDocument();
    });

    test('renders as a button element', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    test('renders with custom children text', () => {
      const customProps = {
        ...defaultProps,
        children: 'Custom Button Text'
      };
      
      renderWithTheme(<AddCardButton {...customProps} />);
      
      expect(screen.getByText('Custom Button Text')).toBeInTheDocument();
    });
  });

  describe('Click Functionality', () => {
    test('calls onClick when clicked', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    test('calls onClick multiple times when clicked multiple times', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(defaultProps.onClick).toHaveBeenCalledTimes(3);
    });

    test('passes correct event object to onClick', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(defaultProps.onClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Disabled State', () => {
    test('button is enabled by default', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('button is disabled when disabled prop is true', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button);
      expect(button).toBeDisabled();
    });

    test('disabled button does not call onClick', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    test('button becomes enabled when disabled prop changes to false', () => {
      const { rerender } = renderWithTheme(<AddCardButton {...defaultProps} disabled={true} />);
      
      let button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Re-render with disabled=false
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={false} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('button becomes disabled when disabled prop changes to true', () => {
      const { rerender } = renderWithTheme(<AddCardButton {...defaultProps} disabled={false} />);
      
      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      
      // Re-render with disabled=true
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={true} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Styling and Appearance', () => {
    test('button has correct base styling', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Check for basic button styling
      expect(button).toHaveStyle({
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      });
    });

    test('button has correct background color when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: '#1976d2' // primary color
      });
    });

    test('button has correct background color when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        backgroundColor: '#e0e0e0' // disabled color
      });
    });

    test('button has correct cursor when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        cursor: 'pointer'
      });
    });

    test('button has correct cursor when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        cursor: 'not-allowed'
      });
    });

    test('button has correct opacity when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        opacity: '0.6'
      });
    });

    test('button has correct opacity when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        opacity: '1'
      });
    });
  });

  describe('Hover Effects', () => {
    test('button has hover effects when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      // Simulate hover
      fireEvent.mouseEnter(button);
      
      // Button should still be functional
      expect(button).not.toBeDisabled();
    });

    test('button maintains disabled state during hover when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      
      // Simulate hover
      fireEvent.mouseEnter(button);
      
      // Button should remain disabled
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('button has proper role', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('button is focusable when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });

    test('button is not focusable when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Disabled buttons typically don't receive focus
      expect(button).not.toHaveFocus();
    });

    test('button has proper tabIndex when enabled', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    test('button has proper tabIndex when disabled', () => {
      const disabledProps = {
        ...defaultProps,
        disabled: true
      };
      
      renderWithTheme(<AddCardButton {...disabledProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Edge Cases', () => {
    test('handles onClick being undefined gracefully', () => {
      const propsWithoutOnClick = {
        ...defaultProps,
        onClick: undefined
      };
      
      renderWithTheme(<AddCardButton {...propsWithoutOnClick} />);
      
      const button = screen.getByRole('button');
      
      // Should not crash when clicked
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });

    test('handles onClick being null gracefully', () => {
      const propsWithNullOnClick = {
        ...defaultProps,
        onClick: null
      };
      
      renderWithTheme(<AddCardButton {...propsWithNullOnClick} />);
      
      const button = screen.getByRole('button');
      
      // Should not crash when clicked
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });

    test('handles very long button text gracefully', () => {
      const longText = 'This is a very long button text that might cause layout issues and should be handled gracefully by the component';
      const propsWithLongText = {
        ...defaultProps,
        children: longText
      };
      
      renderWithTheme(<AddCardButton {...propsWithLongText} />);
      
      // Should render without crashing
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    test('handles empty button text gracefully', () => {
      const propsWithEmptyText = {
        ...defaultProps,
        children: ''
      };
      
      renderWithTheme(<AddCardButton {...propsWithEmptyText} />);
      
      // Should render without crashing
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('handles undefined children gracefully', () => {
      const propsWithUndefinedChildren = {
        ...defaultProps,
        children: undefined
      };
      
      renderWithTheme(<AddCardButton {...propsWithUndefinedChildren} />);
      
      // Should render without crashing
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently', () => {
      const startTime = performance.now();
      renderWithTheme(<AddCardButton {...defaultProps} />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });

    test('handles rapid clicks efficiently', () => {
      renderWithTheme(<AddCardButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      const startTime = performance.now();
      
      // Perform 100 rapid clicks
      for (let i = 0; i < 100; i++) {
        fireEvent.click(button);
      }
      
      const endTime = performance.now();
      
      // Should handle 100 clicks in reasonable time (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(100);
    });
  });

  describe('Integration', () => {
    test('works correctly with parent component state changes', () => {
      const { rerender } = renderWithTheme(<AddCardButton {...defaultProps} />);
      
      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      
      // Simulate parent component changing disabled state
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={true} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      // Simulate parent component changing disabled state back
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={false} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('maintains click functionality after state changes', () => {
      const { rerender } = renderWithTheme(<AddCardButton {...defaultProps} />);
      
      let button = screen.getByRole('button');
      fireEvent.click(button);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
      
      // Change disabled state
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={true} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      fireEvent.click(button);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1); // Should not increase
      
      // Change back to enabled
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardButton {...defaultProps} disabled={false} />
        </ThemeProvider>
      );
      
      button = screen.getByRole('button');
      fireEvent.click(button);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2); // Should increase again
    });
  });
});
