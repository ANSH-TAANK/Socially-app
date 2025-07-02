"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content:string,image:string){ // Function to create a new post
    try{
        const userId = await getDbUserId();

        const post = await prisma.post.create({ // Create a new post in the database
            data:{
                content,
                image,
                authorId:userId
            }
        })
        revalidatePath("/");// Revalidate the home page to reflect the new post
        // Optionally, you can also revalidate the user's profile page if needed
        return {success:true,post}; // Return success status and the created post
    }catch(error){
        console.error("Failed to create post:", error); 
        return {success:false,error:"Failed to create post"}; // Return failure status and error message
    }
}
    
//this file contains the action to create a post
// it uses the prisma client to interact with the database 

    
