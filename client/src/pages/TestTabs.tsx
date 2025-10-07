import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestTabs() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Test de 5 Tabs</h1>

      {/* Test con TabsList normal */}
      <Tabs defaultValue="tab1" className="space-y-6 mb-12">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          <TabsTrigger value="tab4" className="bg-green-200 text-green-800 font-bold">🔧 TAB 4</TabsTrigger>
          <TabsTrigger value="tab5">Tab 5</TabsTrigger>
        </TabsList>

        <TabsContent value="tab1">
          <Card>
            <CardHeader>
              <CardTitle>Tab 1 Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Contenido del tab 1</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab2">
          <Card>
            <CardHeader>
              <CardTitle>Tab 2 Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Contenido del tab 2</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab3">
          <Card>
            <CardHeader>
              <CardTitle>Tab 3 Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Contenido del tab 3</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab4">
          <Card>
            <CardHeader>
              <CardTitle>🔧 Tab 4 Sistema - FUNCIONA!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-100 p-4 rounded">
                <p className="text-green-800 font-semibold">✅ Si puedes ver este contenido, el tab Sistema funciona correctamente!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab5">
          <Card>
            <CardHeader>
              <CardTitle>Tab 5 Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Contenido del tab 5</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test adicional */}
      <h2 className="text-2xl font-bold mb-4">Test Adicional</h2>
      <Tabs defaultValue="test1" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test1">Test 1</TabsTrigger>
          <TabsTrigger value="test2">Test 2</TabsTrigger>
        </TabsList>

        <TabsContent value="test1">
          <Card>
            <CardHeader>
              <CardTitle>Test Simple Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Este es un test simple con 2 tabs</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test2">
          <Card>
            <CardHeader>
              <CardTitle>Test 2 También Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Si puedes ver esto, los tabs básicos funcionan bien</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}