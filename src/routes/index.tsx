import { createFileRoute } from '@tanstack/react-router';
import { LoadingScreen } from '../components/layout/LoadingScreen';

export const Route = createFileRoute('/')({
  component: LoadingScreen,
});
