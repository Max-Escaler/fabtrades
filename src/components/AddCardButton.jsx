import React from 'react';

const AddCardButton = ({ onClick, color = '#1976d2', children = 'Add Card', disabled = false }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: disabled ? '#cccccc' : color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {children}
    </button>
  );
};

export default AddCardButton;
