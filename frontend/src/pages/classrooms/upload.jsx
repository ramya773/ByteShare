var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetUploadSignature, useUploadResource } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, UploadCloud, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const uploadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(["notes", "assignment", "ppt", "previous_year_paper", "lab_file"])
});
const REWARDS = {
  notes: 10,
  assignment: 8,
  ppt: 10,
  previous_year_paper: 15,
  lab_file: 12
};
function UploadResource() {
  const { classroomId } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const form = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: "", description: "", type: "notes" }
  });
  const selectedType = form.watch("type");
  const signatureMutation = useGetUploadSignature();
  const resourceMutation = useUploadResource();
  const handleFileChange = /* @__PURE__ */ __name((e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }, "handleFileChange");
  const onSubmit = /* @__PURE__ */ __name(async (values) => {
    if (!file) {
      toast({ variant: "destructive", title: "Missing file", description: "Please select a file to upload." });
      return;
    }
    try {
      setIsUploading(true);
   const sigData = await signatureMutation.mutateAsync();

     
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("upload_preset", sigData.uploadPreset);
      formData.append("resource_type", "raw");
   
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/raw/upload`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        throw new Error("Failed to upload to Cloudinary");
      }
      const cloudinaryData = await res.json();
      // console.log(cloudinaryData);
      await resourceMutation.mutateAsync({
        classroomId,
        data: {
          ...values,
          fileUrl: cloudinaryData.secure_url,
          publicId: cloudinaryData.public_id,
          fileName: cloudinaryData.original_filename || file.name
        }
      });
      
      

      toast({
        title: "Upload successful",
        description: "Your resource has been submitted for review. You'll earn tokens once approved."
      });
      setLocation(`/classrooms/${classroomId}`);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "An error occurred during upload. Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  }, "onSubmit");
  
  return <Layout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Link href={`/classrooms/${classroomId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Classroom
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Upload Resource</CardTitle>
            <CardDescription>Share your knowledge and earn tokens when it's approved.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="bg-sky-500/10 border border-sky-500/20 text-sky-600 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium">Expected Reward</span>
                  <span className="text-xl font-bold">+{REWARDS[selectedType]} Tokens</span>
                </div>

                <FormField
    control={form.control}
    name="title"
    render={({ field }) => <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chapter 4 Lecture Notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>}
  />

                <FormField
    control={form.control}
    name="type"
    render={({ field }) => <FormItem>
                      <FormLabel>Resource Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="notes">Notes</SelectItem>
                          <SelectItem value="assignment">Assignment</SelectItem>
                          <SelectItem value="ppt">Presentation (PPT)</SelectItem>
                          <SelectItem value="previous_year_paper">Previous Year Paper</SelectItem>
                          <SelectItem value="lab_file">Lab File</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>}
  />

                <FormField
    control={form.control}
    name="description"
    render={({ field }) => <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add some context about this file..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>}
  />

                <div className="space-y-2">
                  <label className="text-sm font-medium">File Attachment</label>
                  {!file ? <div
    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
    onClick={() => fileInputRef.current?.click()}
  >
                      <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium">Click to select a file</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, or images</p>
                    </div> : <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-md shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>}
                  <input
    type="file"
    ref={fileInputRef}
    className="hidden"
    onChange={handleFileChange}
  />
                </div>

                <Button type="submit" className="w-full" disabled={isUploading || !file}>
                  {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : "Submit for Review"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>;
}
__name(UploadResource, "UploadResource");
export {
  UploadResource as default
};
