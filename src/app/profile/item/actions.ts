"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ItemStatus, ThresholdAnswer } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { completeItem, logExerciseSession, refereeVerdict, setStatus, toggleStage, writeThresholdLetter } from "@/lib/game";
import { str } from "@/lib/request";
import { assertCanUseItem } from "./access";

const back = (ref: string, extra = "") => `/profile/item?ref=${encodeURIComponent(ref)}${extra}`;

function entryFrom(form: FormData) {
  return {
    did: str(form, "did"),
    changed: str(form, "changed"),
    refereeSaid: str(form, "refereeSaid"),
    visibility: str(form, "visibility") === "VISIBLE" ? ("VISIBLE" as const) : ("PRIVATE" as const),
    date: str(form, "date") ? new Date(str(form, "date")) : undefined,
  };
}

export async function changeStatus(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  const status = str(form, "status") as ItemStatus;
  if (!["NOT_STARTED", "IN_PROGRESS", "POSTPONED"].includes(status)) throw new Error("Invalid status");
  await setStatus(user.id, ref, status as Exclude<ItemStatus, "COMPLETE">);
  revalidatePath("/profile", "layout");
  redirect(back(ref));
}

export async function tickStage(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  await toggleStage(user.id, ref, Number(str(form, "stage")));
  redirect(back(ref, "#stages"));
}

/** Step 1 of the referee dialog: the three questions. */
export async function answerReferee(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  const answers = [str(form, "q1"), str(form, "q2"), str(form, "q3")];
  if (refereeVerdict(answers) === "open") redirect(back(ref, "&referee=open#referee"));
  redirect(back(ref, "&referee=entry#referee"));
}

/** Step 2: three yeses confirmed again, and the log entry. */
export async function completeWithEntry(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  const res = await completeItem(user.id, ref, [str(form, "q1"), str(form, "q2"), str(form, "q3")], entryFrom(form));
  revalidatePath("/profile", "layout");
  redirect(back(ref, res.verdict === "complete" ? "&done=1" : "&referee=open#referee"));
}

export async function logSession(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  await logExerciseSession(user.id, ref, entryFrom(form));
  revalidatePath("/profile", "layout");
  redirect(back(ref, "&logged=1"));
}

export async function saveThresholdLetter(form: FormData) {
  const user = await requireUser();
  const ref = str(form, "ref");
  await assertCanUseItem(user, ref);
  const answer = str(form, "answer") as ThresholdAnswer;
  if (!["YES", "NOT_YET", "YES_WITH_CONDITIONS"].includes(answer)) throw new Error("Choose an answer");
  await writeThresholdLetter(user.id, ref, answer, str(form, "letter"), str(form, "visibility") === "VISIBLE" ? "VISIBLE" : "PRIVATE");
  revalidatePath("/profile", "layout");
  redirect(back(ref, "&letter=1#letter"));
}
