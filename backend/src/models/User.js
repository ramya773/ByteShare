import mongoose, { Schema } from "mongoose";
import bcryptjs from "bcryptjs";
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    tokenBalance: { type: Number, default: 10 },
    reputation: { type: Number, default: 0 }
  },
  { timestamps: true }
);
UserSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcryptjs.hash(this.password, 10);
});
UserSchema.methods.comparePassword = async function(candidate) {
  return bcryptjs.compare(candidate, this.password);
};
const User = mongoose.model("User", UserSchema);
export {
  User
};

