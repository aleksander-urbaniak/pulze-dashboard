import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import type { User } from "../../../lib/types";
import UserGreetingPill from "../../../components/UserGreetingPill";
import PageSectionHeader from "../../../components/PageSectionHeader";

type AnalyticsHeaderProps = {
  user: User;
};

export default function AnalyticsHeader({ user }: AnalyticsHeaderProps) {
  return (
    <PageSectionHeader icon={faChartColumn} title="Analytics" right={<UserGreetingPill user={user} />} />
  );
}
