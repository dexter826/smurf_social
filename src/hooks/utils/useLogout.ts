import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const useLogout = () => {
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  return async () => {
    await logout();
    navigate('/login');
  };
};
