'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { jobOps } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Job } from '@/lib/types'
import {
  Shield,
  Lock,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowLeft,
  IndianRupee,
  Info,
} from 'lucide-react'
import Link from 'next/link'

const PLATFORM_FEE_RATE = 0.02 // 2% gateway fee (≠ commission which is 10% on release)

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'done'>('idle')

  // UPI form
  const [upiId, setUpiId] = useState('')
  const [upiError, setUpiError] = useState('')

  // Card form
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  useEffect(() => {
    // Auth guard: redirect unauthenticated users
    if (!user || user.role !== 'employer') {
      router.push('/login')
      return
    }

    let cancelled = false
    async function load() {
      try {
        const data = await jobOps.findById(jobId)
        if (!cancelled) {
          setJob(data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [jobId, user, router])

  if (loading) {
    return (
      <div className="app-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="app-surface flex items-center justify-center">
        <p className="text-muted-foreground">Job not found.</p>
      </div>
    )
  }

  const amount = job.payAmount ?? 0
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE)
  const total = amount + platformFee

  const formatCard = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const handlePay = async (method: string) => {
    if (method === 'upi' && !upiId.includes('@')) {
      setUpiError('Enter a valid UPI ID (e.g. 9876543210@upi)')
      return
    }
    setUpiError('')
    setPaymentState('processing')

    // Simulate network + bank processing delay
    await new Promise((res) => setTimeout(res, 2800))

    setPaymentState('done')
    router.push(`/employer/payment/${jobId}/success`)
  }

  const handleUpiApp = (appUpi: string) => {
    setUpiId(appUpi)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-800">HyperLocal Pay</span>
          <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
            <Shield className="w-3 h-3 mr-1" /> Secure Checkout
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3 h-3" /> 256-bit SSL encrypted
        </div>
      </div>

      {paymentState === 'processing' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center gap-6">
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-5 shadow-2xl w-80">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-slate-800 text-lg">Processing Payment</p>
              <p className="text-sm text-slate-500 mt-1">Please do not close this window</p>
            </div>
            <div className="text-xs text-slate-400 text-center">
              Verifying with your bank…
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-5 gap-6">
        {/* Order summary */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-700">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 line-clamp-2">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.category} · {job.location}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Job Amount</span>
                  <span className="font-medium">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-xs">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3" /> Platform Fee (2%)
                  </span>
                  <span>₹{platformFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-slate-800 text-base">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">🔒 Escrow Protection</p>
                <p>Your payment is held securely. Released only after the worker completes the job.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Shield className="w-4 h-4 text-green-600 shrink-0" />
            <span>Payments protected by HyperLocal Escrow. 100% refund guarantee if job is not completed.</span>
          </div>
        </div>

        {/* Payment form */}
        <div className="md:col-span-3">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-700">Choose Payment Method</CardTitle>
                <Link href="/employer/jobs" className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600">
                  <ArrowLeft className="w-3 h-3" /> Cancel
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upi">
                <TabsList className="grid grid-cols-3 w-full mb-6">
                  <TabsTrigger value="upi" className="flex items-center gap-1.5 text-sm">
                    <Smartphone className="w-4 h-4" /> UPI
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-1.5 text-sm">
                    <CreditCard className="w-4 h-4" /> Card
                  </TabsTrigger>
                  <TabsTrigger value="netbanking" className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4" /> Net Banking
                  </TabsTrigger>
                </TabsList>

                {/* UPI Tab */}
                <TabsContent value="upi" className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Google Pay', id: 'success@razorpay', color: 'bg-blue-50 border-blue-200', logo: '🟢' },
                      { name: 'PhonePe', id: 'success@ybl', color: 'bg-purple-50 border-purple-200', logo: '🟣' },
                      { name: 'Paytm', id: 'success@paytm', color: 'bg-sky-50 border-sky-200', logo: '🔵' },
                    ].map((app) => (
                      <button
                        key={app.name}
                        onClick={() => handleUpiApp(app.id)}
                        className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:shadow-sm transition-all ${
                          upiId === app.id ? 'ring-2 ring-primary' : ''
                        } ${app.color}`}
                      >
                        <span className="text-xl">{app.logo}</span>
                        <span className="text-xs font-medium text-slate-700">{app.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-xs text-slate-400">OR ENTER UPI ID</span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upiId" className="text-sm text-slate-700">UPI ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="upiId"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(e) => { setUpiId(e.target.value); setUpiError('') }}
                        className={upiError ? 'border-red-400' : ''}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => {
                          if (!upiId.includes('@')) setUpiError('Enter a valid UPI ID')
                          else setUpiError('')
                        }}
                      >
                        Verify
                      </Button>
                    </div>
                    {upiError && <p className="text-xs text-red-500">{upiError}</p>}
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                    onClick={() => handlePay('upi')}
                    disabled={paymentState !== 'idle'}
                  >
                    <IndianRupee className="w-5 h-5 mr-1" />
                    Pay ₹{total.toLocaleString()}
                  </Button>
                </TabsContent>

                {/* Card Tab */}
                <TabsContent value="card" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-700">Card Number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        className="pl-9"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCard(e.target.value))}
                        maxLength={19}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-700">Cardholder Name</Label>
                    <Input
                      placeholder="Name as on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">Expiry</Label>
                      <Input
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-700">CVV</Label>
                      <Input
                        placeholder="•••"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={() => handlePay('card')}
                    disabled={paymentState !== 'idle' || !cardNumber || !cardName || !cardExpiry || !cardCvv}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Pay ₹{total.toLocaleString()} Securely
                  </Button>
                </TabsContent>

                {/* Net Banking Tab */}
                <TabsContent value="netbanking" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
                      'Kotak Bank', 'Punjab National Bank',
                    ].map((bank) => (
                      <button
                        key={bank}
                        className="border rounded-lg p-3 text-sm text-slate-700 hover:border-primary hover:bg-primary/5 transition-all text-left"
                        onClick={() => handlePay('netbanking')}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 text-center">You will be redirected to your bank's portal</p>
                </TabsContent>
              </Tabs>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> PCI DSS Compliant</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-green-500" /> RBI Approved</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-green-500" /> 256-bit SSL</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
