"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content:string,image:string){ // Function to create a new post
    try{
        const userId = await getDbUserId();
        if(!userId) return; // If the user is not authenticated, return nothing
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

 export async function getPosts(){
    try{
        const posts = await prisma.post.findMany({
            orderBy:{
                createdAt:"desc" // Fetch posts ordered by creation date in descending order
            },
            include:{
                author:{
                    select:{
                        name:true,
                        username:true,
                        image:true,
                        id:true
                    } // Include author details in the post data
                },
                comments:{
                    include :{
                        author:{
                            select:{
                                id:true,
                                name:true,
                                username:true,
                                image:true
                            }
                        }
                    },
                    orderBy:{
                        createdAt:"asc" // Fetch comments ordered by creation date in descending order
                    }
                },
                likes:{
                    select:{
                        userId:true
                    } // Include likes on the post
                },
                _count:{
                    select:{
                        likes:true, // Count of likes on the post
                        comments:true // Count of comments on the post
                    }
                }
            },
        });
        return posts; // Return the list of posts
    }catch(error){
        console.log("Error fetching posts:", error);
        throw new Error("Failed to fetch posts"); // Throw an error if fetching posts fails
    }
 }

export async function toggleLike(postId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return;

    // check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) throw new Error("Post not found");

    if (existingLike) {
      // unlike
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
    } else {
      // like and create notification (only if liking someone else's post)
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            postId,
          },
        }),
        ...(post.authorId !== userId
          ? [
              prisma.notification.create({
                data: {
                  type: "LIKE",
                  userId: post.authorId, // recipient (post author)
                  creatorId: userId, // person who liked
                  postId,
                },
              }),
            ]
          : []),
      ]);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return { success: false, error: "Failed to toggle like" };
  }
}

export async function createComment(postId: string, content: string) {
  try {
    const userId = await getDbUserId();

    if (!userId) return;
    if (!content) throw new Error("Content is required");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) throw new Error("Post not found");

    // Create comment and notification in a transaction
    const [comment] = await prisma.$transaction(async (tx) => { //transaction ensures both operations are atomic ,means if one fails, the other is rolled back
      // Check if the user is trying to comment on their own post
      // Create comment first
      const newComment = await tx.comment.create({
        data: {
          content,
          authorId: userId,
          postId,
        },
      });

      // Create notification if commenting on someone else's post
      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            type: "COMMENT",
            userId: post.authorId,
            creatorId: userId,
            postId,
            commentId: newComment.id,
          },
        });
      }

      return [newComment];
    });

    revalidatePath(`/`);
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to create comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

export async function deletePost(postId: string) {
  try {
    const userId = await getDbUserId();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) throw new Error("Post not found");
    if (post.authorId !== userId) throw new Error("Unauthorized - no delete permission");

    await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath("/"); // purge the cache
    return { success: true };
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}