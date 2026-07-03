var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });
import { Router } from "express";
import mongoose from "mongoose";
import { Classroom } from "../models/Classroom";
import { Resource, TOKEN_REWARDS } from "../models/Resource";
import { User } from "../models/User";
import { TokenTransaction } from "../models/TokenTransaction";
import { Notification } from "../models/Notification";
import { requireAuth } from "../middlewares/auth";
import { UploadResourceBody, RejectResourceBody } from "@workspace/api-zod";
const router = Router();
function formatResource(resource, uploaderName) {
  return {
    id: resource._id.toString(),
    title: resource.title,
    description: resource.description ?? null,
    type: resource.type,
    fileUrl: resource.fileUrl,
    publicId: resource.publicId,
    fileName: resource.fileName,
    status: resource.status,
    uploaderId: resource.uploaderId.toString(),
    uploaderName,
    classroomId: resource.classroomId.toString(),
    rejectionReason: resource.rejectionReason ?? null,
    tokenReward: resource.tokenReward,
    createdAt: resource.createdAt,
  };
}
__name(formatResource, "formatResource");
router.get(
  "/classrooms/:classroomId/resources",
  requireAuth,
  async (req, res) => {
    const { classroomId } = req.params;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    const isMember = classroom.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (!isMember) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    const resources = await Resource.find({
      classroomId,
      status: "approved",
    }).sort({ createdAt: -1 });
    const uploaderIds = [
      ...new Set(resources.map((r) => r.uploaderId.toString())),
    ];
    const uploaders = await User.find(
      { _id: { $in: uploaderIds } },
      { name: 1 },
    );
    const uploaderMap = Object.fromEntries(
      uploaders.map((u) => [u._id.toString(), u.name]),
    );
    res.json(
      resources.map((r) =>
        formatResource(r, uploaderMap[r.uploaderId.toString()] ?? ""),
      ),
    );
  },
);
router.post(
  "/classrooms/:classroomId/resources",
  requireAuth,
  async (req, res) => {
    const { classroomId } = req.params;
    const parsed = UploadResourceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    const isMember = classroom.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (!isMember) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    const tokenReward = TOKEN_REWARDS[parsed.data.type];
    const resource = await Resource.create({
      title: parsed.data.title,
      description: parsed.data.description ?? void 0,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl,
      publicId: parsed.data.publicId,
      fileName: parsed.data.fileName,
      classroomId: new mongoose.Types.ObjectId(classroomId),
      uploaderId: req.user._id,
      status: "pending",
      tokenReward,
    });
    res.status(201).json(formatResource(resource, req.user.name));
  },
);
router.get(
  "/classrooms/:classroomId/resources/pending",
  requireAuth,
  async (req, res) => {
    const { classroomId } = req.params;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    if (classroom.hostId.toString() !== userId) {
      res
        .status(403)
        .json({ error: "Only the host can view pending resources" });
      return;
    }
    const resources = await Resource.find({
      classroomId,
      status: "pending",
    }).sort({ createdAt: -1 });
    const uploaderIds = [
      ...new Set(resources.map((r) => r.uploaderId.toString())),
    ];
    const uploaders = await User.find(
      { _id: { $in: uploaderIds } },
      { name: 1 },
    );
    const uploaderMap = Object.fromEntries(
      uploaders.map((u) => [u._id.toString(), u.name]),
    );
    res.json(
      resources.map((r) =>
        formatResource(r, uploaderMap[r.uploaderId.toString()] ?? ""),
      ),
    );
  },
);
router.post(
  "/classrooms/:classroomId/resources/:resourceId/approve",
  requireAuth,
  async (req, res) => {
    const { classroomId, resourceId } = req.params;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    if (classroom.hostId.toString() !== userId) {
      res.status(403).json({ error: "Only the host can approve resources" });
      return;
    }
    const resource = await Resource.findById(resourceId);
    if (!resource || resource.classroomId.toString() !== classroomId) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    if (resource.status !== "pending") {
      res.status(400).json({ error: "Resource is not pending" });
      return;
    }
    resource.status = "approved";
    await resource.save();
    await User.findByIdAndUpdate(resource.uploaderId, {
      $inc: { tokenBalance: resource.tokenReward, reputation: 5 },
    });
    await TokenTransaction.create({
      userId: resource.uploaderId,
      type: "earned",
      amount: resource.tokenReward,
      description: `Resource approved: "${resource.title}"`,
      resourceTitle: resource.title,
      classroomName: classroom.name,
    });
    await Notification.create({
      userId: resource.uploaderId,
      type: "resource_approved",
      message: `Your resource "${resource.title}" was approved! You earned ${resource.tokenReward} tokens.`,
      resourceTitle: resource.title,
      classroomName: classroom.name,
    });
    const uploader = await User.findById(resource.uploaderId, { name: 1 });
    res.json(formatResource(resource, uploader?.name ?? ""));
  },
);
router.post(
  "/classrooms/:classroomId/resources/:resourceId/reject",
  requireAuth,
  async (req, res) => {
    const { classroomId, resourceId } = req.params;
    const parsed = RejectResourceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    if (classroom.hostId.toString() !== userId) {
      res.status(403).json({ error: "Only the host can reject resources" });
      return;
    }
    const resource = await Resource.findById(resourceId);
    if (!resource || resource.classroomId.toString() !== classroomId) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    if (resource.status !== "pending") {
      res.status(400).json({ error: "Resource is not pending" });
      return;
    }
    resource.status = "rejected";
    resource.rejectionReason = parsed.data.reason;
    await resource.save();
    await Notification.create({
      userId: resource.uploaderId,
      type: "resource_rejected",
      message: `Your resource "${resource.title}" was rejected.`,
      resourceTitle: resource.title,
      classroomName: classroom.name,
      rejectionReason: parsed.data.reason,
    });
    const uploader = await User.findById(resource.uploaderId, { name: 1 });
    res.json(formatResource(resource, uploader?.name ?? ""));
  },
);
router.post(
  "/classrooms/:classroomId/resources/:resourceId/download",
  requireAuth,
  async (req, res) => {
    const { classroomId, resourceId } = req.params;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      res.status(404).json({ error: "Classroom not found" });
      return;
    }
    const userId = req.user._id.toString();
    const isMember = classroom.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (!isMember) {
      res.status(403).json({ error: "Not a member" });
      return;
    }
    const resource = await Resource.findById(resourceId);
    if (!resource || resource.status !== "approved") {
      res.status(404).json({ error: "Resource not found" });
      return;
    }
    const isOwn = resource.uploaderId.toString() === userId;
    const DOWNLOAD_COST = 5;
    let tokensDeducted = 0;
    let newBalance = req.user.tokenBalance;
    if (!isOwn) {
      if (req.user.tokenBalance < DOWNLOAD_COST) {
        res
          .status(402)
          .json({
            error: "Insufficient tokens. You need 5 tokens to download.",
          });
        return;
      }
      const updated = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { tokenBalance: -DOWNLOAD_COST } },
        { new: true },
      );
      tokensDeducted = DOWNLOAD_COST;
      newBalance = updated?.tokenBalance ?? newBalance - DOWNLOAD_COST;
      await TokenTransaction.create({
        userId: req.user._id,
        type: "spent",
        amount: DOWNLOAD_COST,
        description: `Downloaded resource: "${resource.title}"`,
        resourceTitle: resource.title,
        classroomName: classroom.name,
      });
    }
    // const downloadUrl = resource.fileUrl;
    //   // const downloadUrl = resource.fileUrl.replace("/upload/", "/upload/fl_attachment/");
    //   console.log("URL : ",downloadUrl);

    //   res.json({ downloadUrl, tokensDeducted, newBalance });
    // Paste this right before res.json(...) at the end of your download route:
let downloadUrl = resource.fileUrl;

if (downloadUrl.includes("/raw/upload/")) {
  // Remove the trailing .pdf extension so Cloudinary finds the raw public_id
  if (downloadUrl.endsWith(".pdf")) {
    downloadUrl = downloadUrl.slice(0, -4);
  }
  // Inject the attachment parameter to force direct download
  downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
} else {
  // If it's stored as an image, inject the attachment flag
  downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
}

res.json({ downloadUrl, tokensDeducted, newBalance });
  },
);
var stdin_default = router;
export { stdin_default as default };

