import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-background min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            AI Creator Studio
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered image and video generation platform
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">Batch processing</Badge>
            <Badge variant="outline">Intelligent caching</Badge>
            <Badge>Multiple AI models</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Image Generation</CardTitle>
              <CardDescription>Create stunning images with AI</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/create">
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video Creation</CardTitle>
              <CardDescription>Generate videos from text prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tasks/create">
                <Button variant="outline" className="w-full">Explore</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>Browse and manage prompt templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/prompts">
                <Button variant="secondary" className="w-full">View Templates</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <div className="space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <Label htmlFor="email">Get started with your email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1"
                />
                <Button>Subscribe</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}