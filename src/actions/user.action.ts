"use server"; // This is a server action file in Next.js

import prisma from "@/lib/prisma";
// Import the Prisma client instance to interact with the database.
import { auth, currentUser } from "@clerk/nextjs/server";
import { get } from "http";
import { revalidatePath } from "next/cache";

export async function syncUser() {
  // This function is called to sync the user data with the database.
  // You can implement the logic to fetch user data from Clerk and save it to your database.
  // For example, you might use Prisma to create or update a user record.
  
  // Example:
  // const user = await currentUser();
  // if (user) {
  //   await prisma.user.upsert({
  //     where: { clerkId: user.id },
  //     update: { ...user },
  //     create: { clerkId: user.id, ...user },
  //   });
  // }
  try {
    const {userId} = await auth(); // Get the current user's ID from Clerk's auth context
    // auth() returns an object containing the user's ID and other auth-related information.
    // If the user is not authenticated, userId will be undefined.
    const user = await currentUser(); // Fetch the current user from Clerk

    if(!user || !userId) return;
    //check if user already exists in the database

    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    }); // Find user by Clerk ID

    if (existingUser) return existingUser; // If user already exists, return the existing user


    const dbUser = await prisma.user.create({
        data:{
            clerkId : userId,
            name :`${user.firstName || ""} ${user.lastName || ""}`,
            username :user.username ?? user.emailAddresses[0]?.emailAddress.split("@")[0],// Use email prefix as username if no username is set
            email: user.emailAddresses[0].emailAddress,
            image : user.imageUrl,
        }
    }) // Create a new user in the database with Clerk's user data


    return dbUser; 
  }catch (error) {
    console.error("Error syncing user:", error);
  } // Handle any errors that occur during the sync process
}

//this file is used to sync the user data with the database when the user logs in or registers.
// It uses Clerk's currentUser function to get the user's data and Prisma to interact with the
// database. The syncUser function checks if the user already exists in the database and creates a new user if not.
// You can call this function in your components or API routes to ensure the user data is always up-to-date.
// This is a server action file in Next.js, which allows you to perform server-side operations
// such as database queries and user authentication.
//this was the explanation of the code above

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { 
      clerkId ,
    },
    include :{
      _count: {
        select: { 
          followers:true,
          following:true,
          posts:true,
        },
      },
    },
  });
} // This function retrieves a user from the database by their Clerk ID.
// It uses Prisma to find the user and includes a count of their followers, following, and posts.

export async function getDbUserId(){
  const {userId : clerkId} = await auth(); // Get the current user's ID from Clerk's auth context
  // auth() returns an object containing the user's ID and other auth-related information.

  if(!clerkId) return null; // If the user is not authenticated, throw an error

  const user = await getUserByClerkId(clerkId); // Fetch the user from the database using Clerk's user ID

  if(!user) throw new Error("User not found"); // If the user is not found in the database, throw an error

  return user.id; // Return the user's ID from the database
  // This function is used to get the database user ID of the currently authenticated user.
}
//basically we have clerk and prisma so what it does is that using clerks userid it retrieves the user from the database using prisma and returns the user id
// This is useful for getting the user ID of the currently authenticated user in our application.

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId(); // Get the current user's database ID
    if(!userId) return []; // If the user is not authenticated, return an empty array
    //we will try to get 3 random users excluding ourselves and user that we already follows.

    const randomUsers = await prisma.user.findMany({

      where:{
        AND:[
          {NOT:{id:userId}}, // Exclude the current user
          {
            NOT:{
              followers:{
                some: {
                  followerId: userId, // Exclude users that the current user already follows
                }
              }
            }
          },
        ]
      },
      select:{
        id: true,
        name: true,
        username: true,
        image: true,
        _count:{
          select:{
            followers: true,
          }
        }
      },
      take: 3, // Limit the result to 3 random users
  })

  return randomUsers; // Return the list of random users
  }catch(error){
    console.log("Error fetching random users:", error);
    return []; // Return an empty array if there's an error
  }
} // This function retrieves a list of random users from the database.

export async function toggleFollow(targetUserId: string) {
  try{
    const userId = await getDbUserId(); // Get the current user's database ID
    if(!userId) return; // If the user is not authenticated, return nothing
    if(userId === targetUserId) {
      throw new Error("You cannot follow yourself"); // Prevent following oneself
    }
    const existingFollow = await prisma.follows.findUnique({
      where:{
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      }
    })

    if(existingFollow){
      //unfollow the user
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          }
        }
      });
    }else{
      //follow the user
       await prisma.$transaction([
        prisma.follows.create({
          data:{
            followerId: userId,
            followingId: targetUserId,
          }
        }),
       
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId,
            creatorId: userId,
          }
        }),
       ])
    }
    revalidatePath("/"); // Revalidate the home page to reflect the changes in follow status
    return{success: true}; // Return success status
  }catch(error){
    console.log("Error toggling follow status:", error);
    return{success: false, error: "Failed to toggle follow status" }; // Return error status if there's an issue
  }
} // This function toggles the follow status of a user.