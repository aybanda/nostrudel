import { useMemo, useRef, useState } from "react";
import { Button, Flex, FormControl, FormLabel, Heading, Input, VisuallyHidden, useToast } from "@chakra-ui/react";
import SimpleMDE, { SimpleMDEReactProps } from "react-simplemde-editor";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactDOMServer from "react-dom/server";
import { useForm } from "react-hook-form";
import { EventTemplate } from "nostr-tools";
import dayjs from "dayjs";

import EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";

import VerticalPageLayout from "../../components/vertical-page-layout";
import { removeNonASCIIChar } from "../../helpers/string";
import { usePublishEvent } from "../../providers/global/publish-provider";
import { WIKI_PAGE_KIND } from "../../helpers/nostr/wiki";
import { getSharableEventAddress } from "../../helpers/nip19";
import { WIKI_RELAYS } from "../../const";
import useAppSettings from "../../hooks/use-app-settings";
import { uploadFileToServers } from "../../helpers/media-upload/blossom";
import useUsersMediaServers from "../../hooks/use-user-media-servers";
import { useSigningContext } from "../../providers/global/signing-provider";
import useCurrentAccount from "../../hooks/use-current-account";
import useCacheForm from "../../hooks/use-cache-form";
import MarkdownEditor from "./components/markdown-editor";

export default function CreateWikiPageView() {
  const account = useCurrentAccount();
  const { mediaUploadService } = useAppSettings();
  const { servers } = useUsersMediaServers(account?.pubkey);
  const toast = useToast();
  const { requestSignature } = useSigningContext();
  const publish = usePublishEvent();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const presetTopic = search.get("topic");
  const presetTitle = search.get("title");

  const { register, setValue, getValues, handleSubmit, watch, formState, reset } = useForm({
    defaultValues: { content: "", title: presetTitle || presetTopic || "", topic: presetTopic || "" },
    mode: "all",
  });

  const clearFormCache = useCacheForm(
    presetTopic ? "wiki-" + presetTopic : "wiki-create-page",
    // @ts-expect-error
    getValues,
    setValue,
    formState,
  );

  watch("content");
  register("content", {
    minLength: 10,
    required: true,
  });

  const submit = handleSubmit(async (values) => {
    try {
      const draft: EventTemplate = {
        kind: WIKI_PAGE_KIND,
        content: values.content,
        tags: [
          ["d", values.topic],
          ["title", values.title],
          ["published_at", String(dayjs().unix())],
        ],
        created_at: dayjs().unix(),
      };

      const pub = await publish("Publish Page", draft, WIKI_RELAYS, false);
      clearFormCache();
      navigate(`/wiki/page/${getSharableEventAddress(pub.event)}`);
    } catch (error) {
      if (error instanceof Error) toast({ description: error.message, status: "error" });
    }
  });

  return (
    <VerticalPageLayout as="form" h="full" onSubmit={submit}>
      <Heading>Create Page</Heading>
      <Flex gap="2" wrap={{ base: "wrap", md: "nowrap" }}>
        <FormControl w={{ base: "full", md: "sm" }} isRequired flexShrink={0}>
          <FormLabel>Topic</FormLabel>
          <Input
            placeholder="banana"
            isRequired
            {...register("topic", {
              onBlur: () => {
                const v = removeNonASCIIChar(getValues().topic);
                setValue("topic", v.replaceAll(" ", "_").toLocaleLowerCase());
                if (!getValues().title) setValue("title", v, { shouldDirty: true });
              },
            })}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Title</FormLabel>
          <Input {...register("title", { required: true })} autoComplete="off" />
        </FormControl>
      </Flex>
      <MarkdownEditor value={getValues().content} onChange={(v) => setValue("content", v)} />
      <Flex gap="2" justifyContent="flex-end">
        <Button onClick={() => navigate(-1)}>Cancel</Button>
        {formState.isDirty && <Button onClick={() => reset()}>Clear</Button>}
        <Button colorScheme="primary" type="submit" isLoading={formState.isSubmitting}>
          Publish
        </Button>
      </Flex>
    </VerticalPageLayout>
  );
}
