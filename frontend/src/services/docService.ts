import apiClient from './apiClient';

export interface DocItem {
  slug: string;
  title: string;
  departmentCode: string | null;
}

export interface DocContent {
  slug: string;
  title: string;
  content: string;
}

class DocService {
  async listDocs(): Promise<DocItem[]> {
    try {
      const response = await apiClient.get('/docs');
      return (response.data as DocItem[]) || [];
    } catch (error) {
      console.error('Error fetching docs list:', error);
      throw error;
    }
  }

  async getDocContent(slug: string): Promise<DocContent> {
    try {
      const response = await apiClient.get(`/docs/${slug}`);
      return response.data as DocContent;
    } catch (error) {
      console.error('Error fetching doc content:', error);
      throw error;
    }
  }

  async updateDocContent(slug: string, content: string): Promise<void> {
    try {
      await apiClient.put(`/docs/${slug}`, { content });
    } catch (error) {
      console.error('Error updating doc content:', error);
      throw error;
    }
  }
}

export default new DocService();
