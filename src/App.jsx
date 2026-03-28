import { useState, useEffect } from 'react';
import './App.css';

// Данные для подрядчиков (пример)
const contractors = {
  Moscow: { name: 'Подрядчик Москвы', description: 'Описание подрядчика Москвы' },
  SaintPetersburg: { name: 'Подрядчик СПб', description: 'Описание подрядчика СПб' },
  Kazan: { name: 'Подрядчик Казани', description: 'Описание подрядчика Казани' },
  Ekaterinburg: { name: 'Подрядчик Екатеринбурга', description: 'Описание подрядчика Екатеринбурга' },
  Novosibirsk: { name: 'Подрядчик Новосибирска', description: 'Описание подрядчика Новосибирска' },
};

const roles = [
  { name: 'Школа', icon: '🎓' },
  { name: 'СПО и ВО', icon: '📚' },
  { name: 'Подрядные организации', icon: '🏗️' },
  { name: 'Государственные институты', icon: '🏛️' },
];

function App() {
  const [step, setStep] = useState('splash');
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    console.log('APP STEP:', step, 'selectedContractor:', selectedContractor, 'selectedRole:', selectedRole);
    if (step === 'splash') {
      const timer = setTimeout(() => setStep('map'), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, selectedContractor, selectedRole]);

  const handleMapClick = (geo) => {
    const contractor = contractors[geo.properties.NAME_1];
    if (contractor) {
      setSelectedContractor(contractor);
    }
  };

  const handleNext = () => {
    if (selectedContractor) {
      setStep('roles');
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep('login');
  };

  if (step === 'splash') {
    return (
      <div className="splash">
        <h1>Кадровый суверенитет дорожной отрасли</h1>
      </div>
    );
  }

  if (step === 'map') {
    return (
      <div className="app">
        <h1>Выберите регион</h1>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {Object.keys(contractors).map(city => (
            <button
              key={city}
              onClick={() => setSelectedContractor(contractors[city])}
              style={{
                padding: '20px',
                background: 'var(--color-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {city}
            </button>
          ))}
        </div>
        {selectedContractor && (
          <div className="modal">
            <h2>{selectedContractor.name}</h2>
            <p>{selectedContractor.description}</p>
            <button onClick={handleNext}>Далее</button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'roles') {
    return (
      <div className="app">
        <h1>Выберите роль</h1>
        <div className="roles">
          {roles.map(role => (
            <div
              key={role.name}
              className="role-card"
              onClick={() => handleRoleSelect(role)}
            >
              <div style={{ fontSize: '3rem' }}>{role.icon}</div>
              <h3>{role.name}</h3>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleLogin = (e) => {
    e.preventDefault();
    alert('Вход выполнен');
  };

  if (step === 'login') {
    return (
      <div className="app">
        <h1>Вход для {selectedRole.name}</h1>
        <form className="login" onSubmit={handleLogin}>
          <input type="text" placeholder="Логин" required />
          <input type="password" placeholder="Пароль" required />
          <button type="submit">Войти</button>
        </form>
      </div>
    );
  }
console.log('STEP', step, 'selectedContractor', selectedContractor, 'selectedRole', selectedRole);
  return (
    <div className="app">
      <h1>Непредвиденный шаг: {step}</h1>
      <p>selectedContractor: {selectedContractor ? selectedContractor.name : 'нет'}</p>
      <p>selectedRole: {selectedRole ? selectedRole.name : 'нет'}</p>
    </div>
  );
}

export default App;
