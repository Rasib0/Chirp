import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";

import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { PostView } from "../components/postview";
import Link from "next/link";
import { useForm } from "react-hook-form";

//TODO: you can use the same validator for emojis in the frontend and backend to validate on client side
//TODO: You might also want to sync your database with clerk
//TODO: Add OG image support

const CreatePostWizard = () => {
  const { user } = useUser();
  const [input, setInput] = useState("");
  // const {
  //   register,
  //   handleSubmit,
  //   formState: { errors },
  // } = useForm();

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      void ctx.posts.getBatch.invalidate();
    },
    onError: (err) => {
      const errorMessage = err.data?.zodError?.fieldErrors?.content;

      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post! Please try again later.");
      }
    },
  });

  if (!user) return null;
  if (!user.username) return null;
  if (!user.profileImageUrl) return null;

  // const onSubmit = (data: { input: string }) => {
  //   mutate({ content: data.input });
  // };

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href={`/@${user.username}`} className="flex-shrink-0">
          <Image
            className="h-12 w-12 rounded-full"
            src={user.profileImageUrl}
            alt={`@${user.username}'s profile picture`}
            width="48"
            height="48"
          />
        </Link>
        <form className="flex grow overflow-clip">
          <input
            className="grow overflow-clip overflow-ellipsis rounded-sm bg-transparent p-1 outline-none"
            placeholder="Type some emojis!"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                mutate({ content: input });
              }
            }}
            disabled={isPosting}
          />
          {!isPosting && (
            <button
              type="submit"
              className="h-10 rounded-2xl bg-blue-600 px-2  text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full sm:px-4 sm:font-semibold"
              disabled={input === ""}
            >
              Tweet
            </button>
          )}
          <div className="flex items-center">
            {isPosting && (
              <div className="mr-8 flex items-center justify-center">
                <LoadingSpinner size={20} />
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

const useScrollPosition = (
  scrollPosition: number,
  setScrollPosition: Dispatch<SetStateAction<number>>
) => {
  const handleScroll = () => {
    //TODO: use debounce to prevent too many rerenders, and see if you can move the state inside the hook
    //const position = window.scrollY;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    const scrolled = (winScroll / height) * 100;

    setScrollPosition(scrolled);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    console.log("scroll", scrollPosition);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return scrollPosition;
};

const Feed = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const {
    data,
    isLoading: postLoading,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = api.posts.getBatch.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // initialCursor: 1, // <-- optional you can pass an initialCursor
    }
  );

  const scrollPositionOutput = useScrollPosition(
    scrollPosition,
    setScrollPosition
  );

  useEffect(() => {
    if (scrollPositionOutput > 85 && hasNextPage && !isFetching && !isLocked) {
      setIsLocked(true);
      console.log("Fetching next page");
      fetchNextPage()
        .then(() => {
          setIsLocked(false);
          console.log("Fetched next pag");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [scrollPositionOutput, fetchNextPage, hasNextPage, isFetching, isLocked]);

  if (postLoading) return <LoadingPage />;

  if (!data) {
    return <div>Something went wrong</div>;
  }

  const posts = data.pages.flatMap((page) => page.postsWithUserData);

  console.log("scrollPosition", scrollPosition);

  //TODO: add a horizontal loading spinner that twitter uses when you tweet, also add animation to hide th tweet with animation like it's being consumed when you tweet
  return (
    <article className="flex flex-col">
      {posts.map(({ post, author }) => (
        <PostView key={post.id} post={post} author={author} />
      ))}

      {!hasNextPage ? (
        <div className="flex justify-center">
          <p className="p-4 font-semibold text-blue-500">
            No more tweets to load
          </p>
        </div>
      ) : (
        <div className="flex justify-center p-4">
          <LoadingSpinner size={30} />
        </div>
      )}
    </article>
  );
};

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching asap (caching)
  api.posts.getBatch.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      onSuccess: (data) => {
        console.log("data", data.pages[0]?.postsWithUserData[0]?.post.content);
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Return empty div if user isn't loaded
  if (!userLoaded) return <div />;

  return (
    <>
      <Head>
        <title>Chirp</title>
        <meta name="description" content="💬" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <header className="sticky top-0 z-10 border-b border-slate-700 bg-opacity-5 p-4 backdrop-blur-md">
          <div className="flex justify-between px-1">
            <h1 className="text-xl font-bold text-white">Home</h1>

            {isSignedIn && (
              <div className="flex justify-center px-2">
                <UserButton afterSignOutUrl="/" />
                {/* <SignOutButton>
                  <button className="font-bold text-blue-500 hover:text-blue-600">
                    Logout
                  </button>
                </SignOutButton> */}
              </div>
            )}
            {!isSignedIn && (
              // style the sign in button
              <div className="flex justify-center">
                <SignInButton mode="modal">
                  <button className="font-bold text-blue-500 hover:text-blue-600">
                    Sign in
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </header>
        {!!isSignedIn && (
          <div className="border-b border-slate-700 p-4">
            <CreatePostWizard />
          </div>
        )}
        <Feed />
      </PageLayout>
    </>
  );
};

export default Home;
