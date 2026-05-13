import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ImagePlus, Loader2, Save, Send, Trash2, Wand2 } from "lucide-react";
import { MiniSiteInput, MiniSiteStatus } from "@/lib/mini-site-api";

interface MiniSiteEditorProps {
  values: MiniSiteInput;
  status: MiniSiteStatus;
  publicUrl: string;
  isSaving: boolean;
  isPublishing: boolean;
  isUploading: boolean;
  onChange: <K extends keyof MiniSiteInput>(field: K, value: MiniSiteInput[K]) => void;
  onHighlightChange: (index: number, value: string) => void;
  onGalleryRemove: (index: number) => void;
  onLogoUpload: (file: File) => Promise<void>;
  onHeroUpload: (file: File) => Promise<void>;
  onGalleryUpload: (files: FileList) => Promise<void>;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => void;
}

function UploadButton({
  label,
  accept = "image/*",
  multiple = false,
  disabled = false,
  onFilesSelected,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: FileList) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
      <ImagePlus className="h-4 w-4" />
      {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files?.length) {
            onFilesSelected(event.target.files);
            event.target.value = "";
          }
        }}
      />
    </label>
  );
}

const MiniSiteEditor = ({
  values,
  status,
  publicUrl,
  isSaving,
  isPublishing,
  isUploading,
  onChange,
  onHighlightChange,
  onGalleryRemove,
  onLogoUpload,
  onHeroUpload,
  onGalleryUpload,
  onSave,
  onPublish,
  onPreview,
}: MiniSiteEditorProps) => {
  const highlights = Array.from({ length: 4 }, (_, index) => values.highlights?.[index] || "");
  const galleryImages = values.gallery_images || [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4 border-b bg-gradient-to-r from-orange-50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Éditeur de mini-site</CardTitle>
            <CardDescription>
              Une page vitrine unique, personnalisable sans complexité technique, avec publication simple et demande de domaine ensuite.
            </CardDescription>
          </div>
          <Badge variant={status === "published" ? "default" : "secondary"}>{status === "published" ? "Publié" : "Brouillon"}</Badge>
        </div>

        <div className="rounded-xl border bg-white/80 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium text-slate-700">
            <Globe className="h-4 w-4" />
            URL temporaire
          </div>
          <div className="text-muted-foreground">{publicUrl}</div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
            <TabsTrigger value="general">Informations</TabsTrigger>
            <TabsTrigger value="identity">Visuel</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="publication">Publication</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_name">Nom du site</Label>
                <Input id="site_name" value={values.site_name} onChange={(event) => onChange("site_name", event.target.value)} placeholder="Ex: Atelier Maison Dupont" />
                <p className="text-sm text-muted-foreground">Nom affiché sur votre mini-site et dans votre espace client.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug / URL temporaire</Label>
                <Input id="slug" value={values.slug} onChange={(event) => onChange("slug", event.target.value)} placeholder="atelier-maison-dupont" />
                <p className="text-sm text-muted-foreground">Utilisez uniquement des mots simples, sans accents ni espaces.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slogan">Slogan</Label>
              <Input id="slogan" value={values.slogan || ""} onChange={(event) => onChange("slogan", event.target.value)} placeholder="Votre promesse en une phrase" />
              <p className="text-sm text-muted-foreground">Court texte placé près du hero pour résumer votre offre.</p>
            </div>
          </TabsContent>

          <TabsContent value="identity" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <Label>Logo</Label>
                  <p className="text-sm text-muted-foreground">Format image jusqu&apos;à 5 Mo. Il sera affiché dans le hero.</p>
                </div>
                {values.logo_url ? <img src={values.logo_url} alt="Logo" className="h-24 w-auto rounded-md border bg-slate-50 p-2" /> : null}
                <UploadButton label={isUploading ? "Upload..." : "Téléverser un logo"} disabled={isUploading} onFilesSelected={(files) => onLogoUpload(files[0])} />
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <Label>Couleur principale</Label>
                  <p className="text-sm text-muted-foreground">Couleur d&apos;accent utilisée pour les boutons et repères visuels.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input type="color" value={values.primary_color} onChange={(event) => onChange("primary_color", event.target.value)} className="h-12 w-20 p-1" />
                  <Input value={values.primary_color} onChange={(event) => onChange("primary_color", event.target.value)} placeholder="#f97316" />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div>
                <Label>Image bannière / hero</Label>
                <p className="text-sm text-muted-foreground">Image principale de la page. Recommandé : format paysage, claire et qualitative.</p>
              </div>
              {values.hero_image_url ? <img src={values.hero_image_url} alt="Hero" className="h-48 w-full rounded-xl object-cover" /> : null}
              <UploadButton label={isUploading ? "Upload..." : "Téléverser l'image hero"} disabled={isUploading} onFilesSelected={(files) => onHeroUpload(files[0])} />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Titre hero</Label>
              <Input id="hero_title" value={values.hero_title || ""} onChange={(event) => onChange("hero_title", event.target.value)} placeholder="Présentez votre activité en une phrase forte" />
              <p className="text-sm text-muted-foreground">C&apos;est le premier message visible sur la page publique.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Texte d&apos;accroche</Label>
              <Textarea id="hero_subtitle" value={values.hero_subtitle || ""} onChange={(event) => onChange("hero_subtitle", event.target.value)} rows={3} placeholder="Expliquez rapidement ce que vous proposez et pour qui." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_text">Texte de présentation</Label>
              <Textarea id="about_text" value={values.about_text || ""} onChange={(event) => onChange("about_text", event.target.value)} rows={5} placeholder="Présentez votre activité, vos avantages et votre tonalité de marque." />
              <p className="text-sm text-muted-foreground">Quelques paragraphes courts sont suffisants pour ce MVP une page.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`highlight-${index}`}>Point fort {index + 1}</Label>
                  <Input
                    id={`highlight-${index}`}
                    value={highlight}
                    onChange={(event) => onHighlightChange(index, event.target.value)}
                    placeholder={index < 3 ? `Ex: Point fort ${index + 1}` : "Optionnel"}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label>Galerie (3 images max)</Label>
                  <p className="text-sm text-muted-foreground">Montrez quelques visuels clés sans transformer le produit en éditeur complexe.</p>
                </div>
                <UploadButton
                  label={isUploading ? "Upload..." : "Ajouter des images"}
                  multiple
                  disabled={isUploading || galleryImages.length >= 3}
                  onFilesSelected={onGalleryUpload}
                />
              </div>

              {galleryImages.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {galleryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="space-y-2">
                      <img src={image} alt={`Galerie ${index + 1}`} className="h-36 w-full rounded-xl object-cover" />
                      <Button type="button" variant="outline" size="sm" onClick={() => onGalleryRemove(index)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Retirer
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aucune image ajoutée pour le moment.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Téléphone</Label>
                <Input id="contact_phone" value={values.contact_phone || ""} onChange={(event) => onChange("contact_phone", event.target.value)} placeholder="06 12 34 56 78" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" value={values.contact_email || ""} onChange={(event) => onChange("contact_email", event.target.value)} placeholder="contact@mon-site.fr" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta_label">Texte du bouton principal</Label>
                <Input id="cta_label" value={values.cta_label || ""} onChange={(event) => onChange("cta_label", event.target.value)} placeholder="Prendre contact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta_url">Lien externe du bouton</Label>
                <Input id="cta_url" value={values.cta_url || ""} onChange={(event) => onChange("cta_url", event.target.value)} placeholder="https://..." />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="publication" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="font-medium">SEO minimal</div>
                <p className="mt-1 text-sm text-muted-foreground">Préparez au moins un titre et une description pour partager votre mini-site proprement.</p>
              </div>
              <div className="rounded-xl border p-4">
                <div className="font-medium">Publication indépendante du domaine</div>
                <p className="mt-1 text-sm text-muted-foreground">Votre page peut être publiée immédiatement sur l&apos;URL temporaire avant tout domaine personnalisé.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_title">SEO title</Label>
              <Input id="seo_title" value={values.seo_title || ""} onChange={(event) => onChange("seo_title", event.target.value)} placeholder="Titre affiché dans l’onglet du navigateur" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_description">Meta description</Label>
              <Textarea id="seo_description" value={values.seo_description || ""} onChange={(event) => onChange("seo_description", event.target.value)} rows={4} placeholder="Description concise pour le partage et le référencement minimal" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={onPreview}>
                <Wand2 className="mr-2 h-4 w-4" />
                Prévisualiser
              </Button>
              <Button type="button" variant="outline" disabled={isSaving || isPublishing} onClick={onSave}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer
              </Button>
              <Button type="button" disabled={isSaving || isPublishing} onClick={onPublish}>
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publier
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MiniSiteEditor;
