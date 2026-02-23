import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { FileText, Plus, Trash2, Download, Loader2, Upload, ClipboardPaste, Eye, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/use-toast';
import { queryClient, apiRequest, getAuthHeaders } from '@/shared/lib/queryClient';
import { buildApiUrl } from '@/shared/lib/api';
import type { FileUpload, UserConsent } from '@shared/schema';

interface LabSummaryPayload {
  labSummary?: string;
  labMarkers?: Array<{
    name: string;
    value: string | number;
    unit?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  labReportDate?: string | null;
  labChanges?: string[];
  labNextActions?: string[];
  labConfidenceSource?: string | null;
}

function deriveFallbackLabSummary(labReports?: FileUpload[]): string | null {
  if (!labReports || labReports.length === 0) {
    return null;
  }

  const latestCompleted = [...labReports]
    .filter((report: any) => report?.labReportData?.analysisStatus === 'completed')
    .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())[0];

  if (!latestCompleted) {
    return `${labReports.length} lab report${labReports.length > 1 ? 's are' : ' is'} uploaded. Analysis is still processing.`;
  }

  const extracted = Array.isArray((latestCompleted as any)?.labReportData?.extractedData)
    ? ((latestCompleted as any).labReportData.extractedData as any[])
    : [];

  if (extracted.length === 0) {
    return 'Latest report is uploaded and being interpreted. Marker-level extraction will appear shortly.';
  }

  const abnormal = extracted.filter((marker: any) => ['high', 'low', 'critical'].includes(String(marker?.status || '').toLowerCase()));
  if (abnormal.length === 0) {
    return 'Latest uploaded markers appear within normal ranges based on extracted data.';
  }

  const names = abnormal
    .map((marker: any) => marker?.testName || marker?.name)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');

  return `Found ${abnormal.length} out-of-range marker${abnormal.length > 1 ? 's' : ''}${names ? `: ${names}` : ''}.`;
}

function LabReportsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
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
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
  const [editingFiles, setEditingFiles] = useState<Set<string>>(new Set());

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
    refetchInterval: (query) => {
      const reports = query.state.data as FileUpload[] | undefined;
      const hasProcessing = Array.isArray(reports) && reports.some((report: any) => {
        const status = String(report?.labReportData?.analysisStatus || '').toLowerCase();
        return status === 'processing' || status === 'pending';
      });
      return hasProcessing ? 5000 : false;
    },
  });

  const { data: labSummary } = useQuery<LabSummaryPayload>({
    queryKey: ['/api/wearables/health-pulse'],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Check if user has lab data processing consent
  // If consents endpoint fails (backend not deployed), default to showing dialog
  const hasLabDataConsent = consentsError ? false : (consents?.some(
    consent => consent.consentType === 'lab_data_processing' && !consent.revokedAt
  ) ?? false);

  const effectiveLabSummary = labSummary?.labSummary || deriveFallbackLabSummary(labReports);
  const effectiveLabMarkers = Array.isArray(labSummary?.labMarkers) && labSummary!.labMarkers!.length > 0
    ? labSummary!.labMarkers!
    : (() => {
        const latestCompleted = (labReports || [])
          .filter((report: any) => report?.labReportData?.analysisStatus === 'completed')
          .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())[0] as any;
        const extracted = Array.isArray(latestCompleted?.labReportData?.extractedData)
          ? latestCompleted.labReportData.extractedData
          : [];
        return extracted.slice(0, 6).map((marker: any) => ({
          name: marker.testName || marker.name || 'Unknown Marker',
          value: marker.value,
          unit: marker.unit || '',
        }));
      })();

  // Grant consent mutation
  const grantConsentMutation = useMutation({
    mutationFn: async () => {
      console.log('Granting consent...');
      const response = await apiRequest('POST', '/api/consents/grant', {
        consentType: 'lab_data_processing',
        granted: true,
        consentVersion: '1.0',
        consentText: 'User consents to lab data processing for personalized supplement recommendations'
      });
      const result = await response.json();
      console.log('Consent granted:', result);
      return result;
    },
    onSuccess: async () => {
      console.log('Consent grant successful, uploading file...');
      // Invalidate consents to refresh the hasLabDataConsent check
      await queryClient.invalidateQueries({ queryKey: ['/api/consents'] });
      setShowConsentDialog(false);
      if (pendingFile) {
        // Small delay to ensure consent is persisted before upload
        await new Promise(resolve => setTimeout(resolve, 500));
        await uploadFile(pendingFile);
        setPendingFile(null);
      }
    },
    onError: (error: Error) => {
      console.error('Consent grant error:', error);
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

  const reanalyzeMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest('POST', `/api/files/${fileId}/reanalyze`);
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] }),
      ]);
      toast({
        title: 'Re-analysis started',
        description: 'Running in background now. You can leave this page and come back.',
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      }, 5000);

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wearables/health-pulse'] });
      }, 15000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Re-analysis failed',
        description: error.message || 'Could not re-analyze this report.',
        variant: 'destructive',
      });
    },
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

    // Check if user has consent before uploading (only for new entries)
    if (!hasLabDataConsent && !editingFileId) {
      console.log('Manual entry needs consent, showing dialog');
      setShowManualEntryDialog(false);
      // Create the file and store it as pending
      const blob = new Blob([manualEntryText], { type: 'text/plain' });
      const fileName = `${selectedTestType}_manual_entry_${new Date().toISOString().split('T')[0]}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });
      setPendingFile(file);
      setShowConsentDialog(true);
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

      if (!editingFileId) {
        formData.append('type', 'lab_report');
        formData.append('testType', selectedTestType);
        formData.append('metadata', JSON.stringify({
          uploadSource: 'manual-entry',
          testType: selectedTestType,
          originalName: fileName,
          manualEntry: true
        }));
      }

      const url = editingFileId
        ? buildApiUrl(`/api/files/${editingFileId}`)
        : buildApiUrl('/api/files/upload');

      const response = await fetch(url, {
        method: editingFileId ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('Manual entry save error:', response.status, error);

        // Check for consent error
        if (response.status === 403 && !editingFileId) {
          console.log('403 error on manual entry, showing consent dialog');
          setIsUploading(false);
          setPendingFile(file);
          setShowConsentDialog(true);
          toast({
            title: "Consent Required",
            description: "Please grant consent to process your health data.",
          });
          return;
        }

        throw new Error(error.error || 'Save failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/files', 'user', user?.id, 'lab-reports'] });

      toast({
        title: editingFileId ? "Lab results updated" : "Lab results saved",
        description: editingFileId
          ? "Your changes have been saved successfully."
          : "Your manually entered results have been saved successfully.",
      });

      // Reset manual entry and editing state
      setManualEntryText('');
      setEditingFileId(null);
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
  const handleEditReport = async (report: FileUpload) => {
    if (report.mimeType === 'text/plain') {
      setEditingFiles(prev => new Set(prev).add(report.id));
      try {
        const response = await fetch(buildApiUrl(`/api/files/${report.id}/download?t=${Date.now()}`), {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch file content');
        const text = await response.text();
        setManualEntryText(text);
        setEditingFileId(report.id);
        setShowManualEntryDialog(true);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Could not load report content for editing.",
          variant: "destructive",
        });
      } finally {
        setEditingFiles(prev => {
          const next = new Set(prev);
          next.delete(report.id);
          return next;
        });
      }
    }
  };

  const handleViewFile = async (fileId: string) => {
    setLoadingFiles(prev => new Set(prev).add(fileId));
    try {
      const response = await fetch(buildApiUrl(`/api/files/${fileId}/download?t=${Date.now()}`), {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');

      // We can't automatically revoke it since it's used in a new window, 
      // but it will be cleaned up when the page is unloaded.
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not open the report. Please try again.",
        variant: "destructive",
      });
      console.error('View file error:', error);
    } finally {
      setLoadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const latestReportId = labReports?.[0]?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="page-lab-reports">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-[#1B4332] mb-1">Lab Reports</h1>
        <p className="text-[#52796F]">
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
      <Card data-testid="section-upload" className="bg-[#FAF7F2] border-[#52796F]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1B4332]">
            <Upload className="w-5 h-5" />
            Upload New Report
          </CardTitle>
          <CardDescription className="text-[#52796F]">
            Upload blood work, urine tests, or other medical documents (PDF, JPG, PNG)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-report"
              className="flex-1 bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
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
              onClick={() => {
                setEditingFileId(null);
                setManualEntryText('');
                setShowManualEntryDialog(true);
              }}
              disabled={isUploading}
              variant="outline"
              data-testid="button-manual-entry"
              className="flex-1 border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
            >
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Paste Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lab Reports List */}
      {effectiveLabSummary && (
        <Card className="bg-[#FAF7F2] border-[#52796F]/20">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-[#1B4332]">AI Lab Highlights</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                disabled={!latestReportId || reanalyzeMutation.isPending}
                onClick={() => latestReportId && reanalyzeMutation.mutate(latestReportId)}
              >
                {reanalyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Re-analyzing...
                  </>
                ) : (
                  'Re-analyze latest report'
                )}
              </Button>
            </div>
            <CardDescription className="text-[#52796F]">
              {labSummary?.labReportDate ? `Based on report dated ${labSummary.labReportDate}` : 'Based on your latest available report'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[#1B4332] leading-relaxed">{effectiveLabSummary}</p>

            {Array.isArray(labSummary?.labChanges) && labSummary.labChanges.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[#52796F] uppercase tracking-wide">What changed since last report</h4>
                <ul className="mt-1 space-y-1">
                  {labSummary.labChanges.slice(0, 3).map((change, index) => (
                    <li key={`lab-change-${index}`} className="text-sm text-[#1B4332]">• {change}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(labSummary?.labNextActions) && labSummary.labNextActions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[#52796F] uppercase tracking-wide">What to do now</h4>
                <ul className="mt-1 space-y-1">
                  {labSummary.labNextActions.slice(0, 3).map((action, index) => (
                    <li key={`lab-action-${index}`} className="text-sm text-[#1B4332]">• {action}</li>
                  ))}
                </ul>
              </div>
            )}

            {labSummary?.labConfidenceSource && (
              <p className="text-xs text-[#52796F]">{labSummary.labConfidenceSource}</p>
            )}

            {effectiveLabMarkers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {effectiveLabMarkers.slice(0, 6).map((marker: { name: string; value: string | number; unit?: string }, index: number) => (
                  <Badge
                    key={`${marker.name}-${index}`}
                    variant="outline"
                    className="border-[#1B4332]/20 text-[#1B4332] bg-white"
                  >
                    {marker.name}: {marker.value}{marker.unit ? ` ${marker.unit}` : ''}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-testid="section-lab-reports-list" className="bg-[#FAF7F2] border-[#52796F]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1B4332]">
            <FileText className="w-5 h-5" />
            Your Lab Reports
          </CardTitle>
          <CardDescription className="text-[#52796F]">
            {labReports?.length || 0} {labReports?.length === 1 ? 'report' : 'reports'} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {labReportsLoading ? (
              <LabReportsSkeleton />
            ) : labReports && labReports.length > 0 ? (
              labReports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-[#1B4332] bg-white" data-testid={`report-${report.id}`}>
                  <CardContent className="pt-4 px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-[#1B4332] truncate text-lg">{report.originalFileName}</h4>
                        <p className="text-sm text-[#52796F]">
                          Uploaded on {new Date(report.uploadedAt).toLocaleDateString()}
                        </p>
                        {/* <p className="text-sm text-[#52796F]">
                          {report.fileSize ? `${(report.fileSize / 1024 / 1024).toFixed(2)} MB` : ''} • {report.type}
                        </p> */}
                        <p className="text-sm text-[#52796F]">
                          {report.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="default" className="bg-[#1B4332] text-xs whitespace-nowrap">
                          Encrypted
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleViewFile(report.id)}
                          disabled={loadingFiles.has(report.id)}
                          title="View Report"
                        >
                          {loadingFiles.has(report.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" />
                          ) : (
                            <Eye className="w-4 h-4 text-[#1B4332]" />
                          )}
                        </Button>
                        {report.mimeType === 'text/plain' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleEditReport(report)}
                            disabled={editingFiles.has(report.id)}
                            title="Edit Report"
                          >
                            {editingFiles.has(report.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#1B4332]" />
                            ) : (
                              <Edit2 className="w-4 h-4 text-[#1B4332]" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => setFileToDelete(report.id)}
                          data-testid={`button-delete-${report.id}`}
                          title="Delete Report"
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
                <FileText className="w-12 h-12 mx-auto text-[#52796F] mb-3" />
                <h3 className="text-lg font-medium mb-2 text-[#1B4332]">No lab reports yet</h3>
                <p className="text-sm text-[#52796F] mb-4">
                  Upload your blood work, urine tests, or other medical documents to help optimize your formula.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  data-testid="button-upload-first"
                  className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
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
            <DialogTitle>{editingFileId ? 'Edit Lab Results' : 'Paste Lab Results'}</DialogTitle>
            <DialogDescription>
              {editingFileId
                ? 'Update your lab results. Our AI will re-analyze the data to optimize your formula.'
                : 'Copy and paste your lab results directly from your test report or doctor\'s portal.'}
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
                setEditingFileId(null);
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
