import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const eventConfig: Record<string, { icon: React.ReactNode; title: string; description: string; variant: 'success' | 'error' | 'warning' }> = {
  signing_complete: {
    icon: <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />,
    title: 'Contract Signed Successfully',
    description: 'Your publishing contract has been signed and submitted. You will receive a confirmation email shortly.',
    variant: 'success',
  },
  decline: {
    icon: <XCircle className="h-14 w-14 text-destructive mx-auto" />,
    title: 'Contract Declined',
    description: 'You have declined the publishing contract. If this was a mistake, please contact the editorial office.',
    variant: 'error',
  },
  cancel: {
    icon: <AlertCircle className="h-14 w-14 text-yellow-600 mx-auto" />,
    title: 'Signing Cancelled',
    description: 'You cancelled the signing process. You can return to your dashboard to sign the contract later.',
    variant: 'warning',
  },
  ttl_expired: {
    icon: <AlertCircle className="h-14 w-14 text-yellow-600 mx-auto" />,
    title: 'Session Expired',
    description: 'Your signing session has expired. Please return to your dashboard and generate a new signing link.',
    variant: 'warning',
  },
};

const defaultEvent = {
  icon: <AlertCircle className="h-14 w-14 text-muted-foreground mx-auto" />,
  title: 'Unknown Status',
  description: 'We could not determine the outcome. Please return to your dashboard and try again.',
  variant: 'warning' as const,
};

const ContractComplete = () => {
  const [searchParams] = useSearchParams();
  const event = searchParams.get('event') || '';
  const config = eventConfig[event] || defaultEvent;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-3">
          {config.icon}
          <CardTitle className="text-xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground text-sm">{config.description}</p>
          <Link to="/">
            <Button className="w-full">Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractComplete;
