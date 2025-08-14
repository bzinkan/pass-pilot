import { useQuery } from "@tanstack/react-query";
import { CreditCard, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BillingTab({ user }: { user: any }) {
  const { data: school } = useQuery({
    queryKey: ["/api/school", user.schoolId],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments", user.schoolId],
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Plan
            <Button>Upgrade Plan</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900">Plan Type</h4>
              <p className="text-lg font-bold text-primary capitalize">
                {school?.plan || "Free Trial"}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Teachers</h4>
              <p className="text-lg">
                {school?.currentTeachers || 0} / {school?.maxTeachers || 10}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Students</h4>
              <p className="text-lg">
                {school?.currentStudents || 0} / {school?.maxStudents || 500}
              </p>
            </div>
          </div>

          {school?.plan === 'free_trial' && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <Calendar className="text-yellow-600 mr-2" size={20} />
                <div>
                  <p className="font-medium text-yellow-800">Trial Period</p>
                  <p className="text-sm text-yellow-700">
                    {school?.trialEndDate 
                      ? `Expires on ${new Date(school.trialEndDate).toLocaleDateString()}`
                      : "Trial period active"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment History
            <Button variant="outline" size="sm">
              <Download className="mr-2" size={16} />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No payment history available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${payment.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'succeeded' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}