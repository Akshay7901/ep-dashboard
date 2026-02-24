import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Loader2, FileSignature, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ContractSigning = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [signingUrl, setSigning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSigningUrl = async () => {
    if (!ticketNumber) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/proposals/${encodeURIComponent(ticketNumber)}/contract/signing-url`);
      if (data?.signing_url) {
        setSigning(data.signing_url);
      } else {
        setError('No signing URL received from server.');
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 404) {
        setError('No active contract found for this proposal.');
      } else if (status === 400) {
        setError('No DocuSign envelope is associated with this contract.');
      } else if (status === 403) {
        setError('You do not have permission to sign this contract.');
      } else {
        setError(err?.message || 'Failed to generate signing URL.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSigningUrl();
  }, [ticketNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Generating your signing link…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-xl">Unable to Load Contract</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={fetchSigningUrl} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
              <Link to="/">
                <Button variant="ghost" className="w-full">Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <FileSignature className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-xl">Contract Ready for Signing</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Your contract for <span className="font-semibold text-foreground">{ticketNumber}</span> is ready.
            Click the button below to open DocuSign and sign your contract.
          </p>
          <p className="text-xs text-muted-foreground">
            Note: The signing link expires in approximately 5 minutes. If it expires, click "Get New Link" to generate a fresh one.
          </p>
          <div className="flex flex-col gap-2">
            <a href={signingUrl!} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" /> Open & Sign Contract
              </Button>
            </a>
            <Button onClick={fetchSigningUrl} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Get New Link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractSigning;
