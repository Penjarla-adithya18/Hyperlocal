'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb } from '@/lib/mockDb'
import { User } from '@/lib/types'
import { Search, Star, Ban, CheckCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/login')
      return
    }
    loadUsers()
  }, [currentUser, router])

  const loadUsers = async () => {
    const allUsers = await mockDb.getAllUsers()
    setUsers(allUsers.filter(u => u.role !== 'admin'))
  }

  const handleBanUser = async (userId: string) => {
    if (confirm('Are you sure you want to ban this user?')) {
      const updated = await mockDb.updateUser(userId, { isVerified: false })
      if (updated) {
        toast({
          title: 'User Banned',
          description: 'User has been banned from the platform'
        })
        loadUsers()
      }
    }
  }

  const handleVerifyUser = async (userId: string) => {
    const updated = await mockDb.updateUser(userId, { isVerified: true })
    if (updated) {
      toast({
        title: 'User Verified',
        description: 'User has been verified'
      })
      loadUsers()
    }
  }

  const workers = users.filter(u => u.role === 'worker')
  const employers = users.filter(u => u.role === 'employer')

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone || u.phoneNumber || '').includes(searchQuery)
  )

  const UserCard = ({ user }: { user: User }) => (
    <Card className="hover:border-primary transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{user.fullName}</h3>
              {user.isVerified && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{user.phone || user.phoneNumber}</p>
            
            {user.role === 'worker' && user.skills && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}

            {user.role === 'employer' && user.companyName && (
              <p className="text-sm mt-1">Company: {user.companyName}</p>
            )}

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{user.trustScore.toFixed(1)}</span>
              </div>
              <Badge variant={user.role === 'worker' ? 'default' : 'outline'}>
                {user.role}
              </Badge>
            </div>

            <div className="flex gap-2 mt-4">
              {!user.isVerified ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerifyUser(user.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBanUser(user.id)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage workers and employers on the platform</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
            <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
            <TabsTrigger value="employers">Employers ({employers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workers">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.filter(u => 
                u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.phone || u.phoneNumber || '').includes(searchQuery)
              ).map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="employers">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employers.filter(u => 
                u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.phone || u.phoneNumber || '').includes(searchQuery)
              ).map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
