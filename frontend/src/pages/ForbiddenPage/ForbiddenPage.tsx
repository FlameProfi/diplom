import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>{t('forbidden.title')}</h1>
      <p>{t('forbidden.message')}</p>
      <button onClick={() => navigate('/')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        {t('forbidden.backHome')}
      </button>
    </div>
  );
};

export default ForbiddenPage;
