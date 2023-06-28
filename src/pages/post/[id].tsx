import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";

const SinglePostPage: NextPage<{ id: string }> = (props) => {
  const { data } = api.posts.getByPostId.useQuery({
    id: props.id,
  });

  if (!data) {
    return <div>404</div>;
  }

  // since the data is already fetched on the server, the html coming to the client will have the correct metadata and title!
  return (
    <>
      <Head> 
        <title>{`${data.post.content} - @${data.author.username}`}</title>
      </Head>
      <PageLayout>
        <PostView {...data} />
      </PageLayout>
    </>
  );
};

import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import { PostView } from "~/components/postview";

// this function means it will be treated mostly as a static asset
export const getStaticProps: GetStaticProps = async (context) => {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  });

  const id = context.params?.id;

  if (typeof id !== "string") throw new Error("No id");

  // server pay fetch karkay rakho
  await helpers.posts.getByPostId.prefetch({ id });

  return {
    props: {
      trpcState: helpers.dehydrate(), // this let's the data be prefetched on the server so it's available immediately, so loading state is never hit
      id,
    },
    // you can set custom refresh and revalidate times here
  };
};

export const getStaticPaths = () => {
  return {
    paths: [], // any path that is returned here will be pre-rendered
    // fallback: blocking means that if the path is not returned here, it will be generated on the server and cached for future requests
    // fallback: true, means that Nextjs will serve a fallback page on the first request, then generate the page in the background and cache it for future requests
    fallback: "blocking",
  };
};

// the store data here will only change if userprofileimage changes that we can trigger with serverside update, this page will be static i.e. never change!
export default SinglePostPage;
