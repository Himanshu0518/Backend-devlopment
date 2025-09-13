import mongoose from "mongoose";
import bcrpt from "bcrypt";

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatr:{
        type: String,
        required: false
    },
    coverImage:{
        type: String,
    },
    watchHistory:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    }],
    refreshToken: {
        type: String,
        required: false
    }
},
    {
        timestamps: true
    }
);

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = bcrpt.hash(this.password, 10);
    }
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrpt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function () {
    jwt.sign({
        _id: this._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
export const User = mongoose.model("User", userSchema); 