import { useState } from "react";
import { useParams, Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArUcoMarker } from "@/components/common/ArUcoMarker";
import { ArrowLeft, Upload, Download, Square } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export function OMRTemplatePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const regionLabels = {
    studentId: t('templates.designer.studentId'),
    examCode: t('templates.designer.examCode'),
    questionFrame: t('templates.designer.questionFrame'),
  } as const;
  type RegionType = keyof typeof regionLabels;
  const [imageUploaded, setImageUploaded] = useState(false);
  const [regions, setRegions] = useState<RegionType[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<RegionType | null>(null);
  const [regionConfig, setRegionConfig] = useState({
    rows: "",
    cols: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageUploaded(true);
      toast.success(t('templates.designer.imageUploaded'));
    }
  };

  const addRegion = (type: RegionType) => {
    setCurrentRegion(type);
    setConfigOpen(true);
  };

  const handleSaveRegion = () => {
    if (!currentRegion) return;
    setRegions([...regions, currentRegion]);
    setConfigOpen(false);
    setRegionConfig({ rows: "", cols: "" });
    toast.success(t('templates.designer.regionAdded', { region: regionLabels[currentRegion] }));
  };

  const exportPDF = () => {
    toast.success(t('templates.designer.exported'));
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/exams/${id}/edit`} className="inline-flex items-center gap-2 text-primary hover:text-brand-soft-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          {t('templates.designer.backToExam')}
        </Link>
        <h1 className="text-3xl font-semibold text-foreground mt-2">{t('templates.designer.createTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('templates.designer.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tools Panel */}
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.designer.tools')}</CardTitle>
            <CardDescription>{t('templates.designer.toolsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">{t('templates.designer.uploadLabel')}</Label>
              <Input
                id="template"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            {imageUploaded && (
              <>
                <div className="pt-4 border-t space-y-2">
                  <Label>{t('templates.designer.drawRoi')}</Label>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addRegion("studentId")}
                    >
                      <Square className="w-4 h-4" />
                      {regionLabels.studentId}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addRegion("examCode")}
                    >
                      <Square className="w-4 h-4" />
                      {regionLabels.examCode}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addRegion("questionFrame")}
                    >
                      <Square className="w-4 h-4" />
                      {regionLabels.questionFrame}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Label>{t('templates.designer.addedRegions')}</Label>
                  {regions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('templates.designer.noRegions')}</p>
                  ) : (
                    <ul className="space-y-1">
                      {regions.map((region, idx) => (
                        <li key={idx} className="text-sm text-green-600 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          {regionLabels[region]}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={exportPDF} className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    {t('templates.designer.exportPdf')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Canvas Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('templates.designer.canvas')}</CardTitle>
            <CardDescription>{t('templates.designer.canvasDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!imageUploaded ? (
              <div className="aspect-[210/297] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-muted-foreground/70 mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('templates.designer.uploadPrompt')}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[210/297] bg-muted rounded-lg border relative">
                {/* Mock ArUco markers */}
                <div className="absolute top-4 left-4">
                  <ArUcoMarker />
                </div>
                <div className="absolute top-4 right-4">
                  <ArUcoMarker />
                </div>
                <div className="absolute bottom-4 left-4">
                  <ArUcoMarker />
                </div>
                <div className="absolute bottom-4 right-4">
                  <ArUcoMarker />
                </div>

                {/* Mock regions */}
                {regions.includes("studentId") && (
                  <div className="absolute top-20 left-8 right-8 h-20 border-2 border-red-500 bg-danger-foreground/10 flex items-center justify-center">
                    <span className="text-danger-foreground text-sm font-medium">{regionLabels.studentId}</span>
                  </div>
                )}
                {regions.includes("examCode") && (
                  <div className="absolute top-44 left-8 w-24 h-16 border-2 border-blue-500 bg-brand-soft/10 flex items-center justify-center">
                    <span className="text-brand-soft-foreground text-sm font-medium">{regionLabels.examCode}</span>
                  </div>
                )}
                {regions.includes("questionFrame") && (
                  <div className="absolute top-64 left-8 right-8 bottom-20 border-2 border-green-500 bg-success-foreground/10 flex items-center justify-center">
                    <span className="text-green-700 text-sm font-medium">{regionLabels.questionFrame}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Region Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('templates.designer.configTitle', { region: currentRegion })}</DialogTitle>
            <DialogDescription>
              {t('templates.designer.configDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rows">{t('templates.designer.rowsLabel')}</Label>
              <Input
                id="rows"
                type="number"
                placeholder="10"
                value={regionConfig.rows}
                onChange={(e) => setRegionConfig({ ...regionConfig, rows: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cols">{t('templates.designer.colsLabel')}</Label>
              <Input
                id="cols"
                type="number"
                placeholder="4"
                value={regionConfig.cols}
                onChange={(e) => setRegionConfig({ ...regionConfig, cols: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t('templates.designer.cancel')}
            </Button>
            <Button onClick={handleSaveRegion}>{t('templates.designer.saveRegion')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
