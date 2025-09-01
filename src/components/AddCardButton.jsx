import React from 'react';

const AddCardButton = ({ onClick, color = '#1976d2', children = 'Add Card' }) => {
  return (
    <button 
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px',
        backgroundColor: color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      {children}
    </button>
  );
};

export default AddCardButton;
