import { useAuth } from '../../context/AuthContext';
import LayoutPublico from '../../components/LayoutPublico';
import LayoutBackoffice from '../../components/layouts/LayoutBackoffice';
import Caratula from '../../components/Home/Caratula';

export default function Inicio() {
  const { isAuthenticated } = useAuth();
  const Layout = isAuthenticated ? LayoutBackoffice : LayoutPublico;

  return (
    <Layout>
      <Caratula />
    </Layout>
  );
}
