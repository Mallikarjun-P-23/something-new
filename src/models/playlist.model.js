import mongoose,{Schema} from 'mongoose';

const playlistSchema= new Schema({
    name:{
        type:String,
        required:trusted
    },
    description:{
        type:String,
        required:true
    },
    videos:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        r
    }
}
,{
    timestamps:true
})