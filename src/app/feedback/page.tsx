import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"

export default function FeedbackPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Guest feedback, sentiment, and follow-up actions</p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Feedback module — coming in milestone 2
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This page will show:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Post-visit feedback requests and responses</li>
            <li>AI sentiment classification (positive / neutral / negative)</li>
            <li>Unhappy guest flags with suggested recovery actions</li>
            <li>Thank-you message status and follow-up timeline</li>
          </ul>
          <Badge variant="outline" className="mt-2 text-[10px]">
            Requires <code>feedback</code> + <code>follow_up_actions</code> tables and AI orchestrator
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
