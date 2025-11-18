import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Trash2, Download, Loader2, Upload, ClipboardPaste } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest, getAuthHeaders } from '@/lib/queryClient';
import { buildApiUrl } from '@/lib/api';
import type { FileUpload, UserConsent } from '@shared/schema';

function LabReportsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({length: 3}).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LabReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [selectedTestType, setSelectedTestType] = useState<'blood_test'>('blood_test');

  // Fetch user consents
  const { data: consents, isLoading: consentsLoading, error: consentsError } = useQuery<UserConsent[]>({
    queryKey: ['/api/consents'],
    enabled: isAuthenticated && !!user?.id,
    retry: 1, // Don't retry too many times if endpoint doesn't exist yet
  });

  // Fetch lab reports
  const { data: labReports, isLoading: labReportsLoading } = useQuery<FileUpload[]>({
    queryKey: ['/api/files', 'user', user?.id, 'lab-reports'],
    enabled: isAuthenticated && !!user?.id,
  });

  // Check if user has lab data processing consent
  // If consents endpoint fails (backend not deployed), default to showing dialog
  const hasLabDataConsent = consentsError ? false : (consents?.some(
    consent => consent.consentType === 'lab_data_processing' && !consent.revokedAt
  ) ?? false);

  // Grant consent mutation
  const grantConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/consents/grant', {
        consentType: 'lab_data_processing',
        granted: true
      });
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate consents to refresh the hasLabDataConsent check
      await queryClient.invalidateQueries({ queryKey: ['/api/consents'] });
      setShowConsentDialog(false);
      if (pendingFile) {
        await uploadFile(pendingFile);
        setPendingFile(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Consent failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      toast({
        title: "File deleted",
        description: "Lab report has been permanently deleted.",
      });
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  });

  const uploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'lab-report');
      formData.append('metadata', JSON.stringify({
        uploadSource: 'lab-reports-page',
        originalName: file.name
      }));

      const response = await fetch(buildApiUrl('/api/files/upload'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('Upload error response:', response.status, error);
        
        // Check for consent error specifically
        if (response.status === 403) {
          console.log('403 error detected, showing consent dialog');
          setIsUploading(false);
          setPendingFile(file);
          setShowConsentDialog(true);
          toast({
            title: "Consent Required",
            description: "Please grant consent to process your health data before uploading.",
          });
          return;
        }
        
        throw new Error(error.error || 'Upload failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been securely uploaded.`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, 'hasLabDataConsent:', hasLabDataConsent);

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPG, or PNG file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has already consented
    if (hasLabDataConsent) {
      console.log('User has consent, uploading directly');
      // User already has consent, upload directly
      await uploadFile(file);
    } else {
      console.log('User needs consent, showing dialog');
      // User needs to consent first
      setPendingFile(file);
      setShowConsentDialog(true);
    }
  };

  const handleManualEntry = async () => {
    if (!manualEntryText.trim()) {
      toast({
        title: "No data entered",
        description: "Please paste or type your lab results.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setShowManualEntryDialog(false);

    try {
      // Create a text file from the manual entry
      const blob = new Blob([manualEntryText], { type: 'text/plain' });
      const fileName = `${selectedTestType}_manual_entry_${new Date().toISOString().split('T')[0]}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'lab_report');
      formData.append('testType', selectedTestType);
      formData.append('metadata', JSON.stringify({
        uploadSource: 'manual-entry',
        testType: selectedTestType,
        originalName: fileName,
        manualEntry: true
      }));

      const response = await fetch(buildApiUrl('/api/files/upload'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
      
      toast({
        title: "Lab results saved",
        description: "Your manually entered results have been saved successfully.",
      });

      // Reset manual entry
      setManualEntryText('');
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="page-lab-reports">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-1">Lab Reports</h1>
        <p className="text-muted-foreground">
          Upload and manage your blood tests, medical reports, and health documents
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file"
      />

      {/* Upload Section */}
      <Card data-testid="section-upload">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Report
          </CardTitle>
          <CardDescription>
            Upload blood work, urine tests, or other medical documents (PDF, JPG, PNG)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-report"
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload PDF/Image
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowManualEntryDialog(true)}
              disabled={isUploading}
              variant="outline"
              data-testid="button-manual-entry"
              className="flex-1"
            >
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Paste Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lab Reports List */}
      <Card data-testid="section-lab-reports-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Lab Reports
          </CardTitle>
          <CardDescription>
            {labReports?.length || 0} {labReports?.length === 1 ? 'report' : 'reports'} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labReportsLoading ? (
              <LabReportsSkeleton />
            ) : labReports && labReports.length > 0 ? (
              labReports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-primary" data-testid={`report-${report.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{report.originalFileName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uploaded on {new Date(report.uploadedAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.fileSize ? `${(report.fileSize / 1024 / 1024).toFixed(2)} MB` : ''} • {report.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          Encrypted
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setFileToDelete(report.id)}
                          data-testid={`button-delete-${report.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-2">No lab reports yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your blood work, urine tests, or other medical documents to help optimize your formula.
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  data-testid="button-upload-first"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First Report
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consent Dialog */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent data-testid="dialog-consent">
          <DialogHeader>
            <DialogTitle>Consent to Process Health Data</DialogTitle>
            <DialogDescription>
              To upload and analyze your lab results, we need your consent to process your health information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              By providing consent, you agree to allow Ones AI to:
            </p>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li>Process and analyze your uploaded lab results</li>
              <li>Use this data to create personalized supplement recommendations</li>
              <li>Store your health information securely</li>
              <li>Use this data to optimize your formula over time</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Your data is stored with encryption and not shared with third parties. You can revoke this consent at any time from your privacy settings.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConsentDialog(false);
                setPendingFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              data-testid="button-consent-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => grantConsentMutation.mutate()}
              disabled={grantConsentMutation.isPending}
              data-testid="button-consent-agree"
            >
              {grantConsentMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              I Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-manual-entry">
          <DialogHeader>
            <DialogTitle>Paste Lab Results</DialogTitle>
            <DialogDescription>
              Copy and paste your lab results directly from your test report or doctor's portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-type">Test Type</Label>
              <Select value={selectedTestType} onValueChange={(value: any) => setSelectedTestType(value)}>
                <SelectTrigger id="test-type" data-testid="select-test-type">
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_test">Blood Test</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                More test types (urine analysis, iris scan) coming soon.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lab-results">Lab Results</Label>
              <Textarea
                id="lab-results"
                placeholder="Paste your lab results here. Include test names, values, reference ranges, and units.&#10;&#10;Example:&#10;Vitamin D: 32 ng/mL (30-100 ng/mL)&#10;B12: 450 pg/mL (200-900 pg/mL)&#10;Iron: 85 µg/dL (50-170 µg/dL)"
                value={manualEntryText}
                onChange={(e) => setManualEntryText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-lab-results"
              />
              <p className="text-xs text-muted-foreground">
                Our AI will analyze this data to optimize your supplement formula.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManualEntryDialog(false);
                setManualEntryText('');
              }}
              data-testid="button-manual-entry-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleManualEntry}
              disabled={isUploading || !manualEntryText.trim()}
              data-testid="button-manual-entry-save"
            >
              {isUploading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-file">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lab report from your account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">
              No, Keep It
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => fileToDelete && deleteFileMutation.mutate(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteFileMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
