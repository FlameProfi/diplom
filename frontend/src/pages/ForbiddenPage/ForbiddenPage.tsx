import React from 'react';
import { useNavigate } from 'react-router-dom';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>403 - Доступ запрещен</h1>
      <p>У вас нет прав для просмотра этой страницы.</p>
      <button onClick={() => navigate('/')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        На главную
      </button>
    </div>
  );
};

export default ForbiddenPage;
