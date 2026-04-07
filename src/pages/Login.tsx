import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const { user, login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isRegistering) {
        if (!name) return setErrorMsg('El nombre es requerido');
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al intentar autenticar.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo-icon-large">FM</div>
          <h1>Flexomarket</h1>
          <p className="text-muted">{isRegistering ? 'Crea una cuenta' : 'Inicia sesión en tu CRM'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div className="badge badge-danger" style={{ marginBottom: '1rem', whiteSpace: 'normal', textAlign: 'center' }}>{errorMsg}</div>}

          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input 
                type="text" 
                className="form-control" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input 
              type="email" 
              className="form-control" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@flexomarket.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="********"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn">
            {isRegistering ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-muted" style={{ textDecoration: 'underline' }}>
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};
